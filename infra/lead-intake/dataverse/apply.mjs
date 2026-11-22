#!/usr/bin/env node
/**
 * Applies definition.json to the Dataverse environment: publisher, solution, lead columns, business unit, security
 * role, and the application user for the Logic App's managed identity. Idempotent: every step reads first and
 * creates only what is missing. It never deletes or renames anything.
 *
 *   node infra/lead-intake/dataverse/apply.mjs --validate     check the definition only, no network
 *   node infra/lead-intake/dataverse/apply.mjs --apply        apply it
 *
 * --apply reads, from the environment:
 *   DATAVERSE_URL              the environment, e.g. https://dream.crm.dynamics.com (must match the definition)
 *   DATAVERSE_TOKEN            a bearer token for that environment (CI gets it from az; never printed)
 *   INTAKE_IDENTITY_CLIENT_ID  the managed identity's client id (Bicep output identityClientId)
 *
 * The caller must be a Dataverse application user with System Administrator (the one-off bootstrap in
 * docs/lead-intake-runbook.md). Output names objects and ids, never tokens or lead data.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class DefinitionError extends Error {
  constructor(problem) { super(problem); this.name = 'DefinitionError'; }
}

export function loadDefinition(path = join(here, 'definition.json')) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new DefinitionError(`cannot read ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
  validateDefinition(parsed);
  return parsed;
}

export function validateDefinition(d) {
  const problems = [];
  if (!/^https:\/\/[a-z0-9-]+\.crm[0-9]*\.dynamics\.com$/.test(d?.environment ?? '')) problems.push('environment must be an https://<org>.crm*.dynamics.com URL');
  const prefix = d?.publisher?.customizationprefix;
  if (!/^[a-z][a-z0-9]{1,7}$/.test(prefix ?? '')) problems.push('publisher.customizationprefix must be 2 to 8 lowercase letters or digits');
  const optionPrefix = d?.publisher?.customizationoptionvalueprefix;
  if (!Number.isInteger(optionPrefix) || optionPrefix < 10000 || optionPrefix > 99999) problems.push('publisher.customizationoptionvalueprefix must be 10000 to 99999');
  if (!/^[A-Za-z][A-Za-z0-9_]+$/.test(d?.solution?.uniquename ?? '')) problems.push('solution.uniquename is not a valid unique name');
  if (!d?.businessUnit?.name) problems.push('businessUnit.name is required');
  if (!d?.role?.name || !Array.isArray(d.role.privileges) || d.role.privileges.length === 0) problems.push('role needs a name and privileges');
  for (const p of d?.role?.privileges ?? []) if (!/^prv[A-Za-z]+$/.test(p)) problems.push(`privilege ${p} is not a privilege name`);
  if (!['Basic', 'Local', 'Deep', 'Global'].includes(d?.role?.depth)) problems.push('role.depth must be Basic, Local, Deep or Global');
  const seen = new Set();
  for (const c of d?.leadColumns ?? []) {
    if (!c.schemaName?.startsWith(`${prefix}_`)) problems.push(`column ${c.schemaName} must start with ${prefix}_`);
    if (seen.has(c.schemaName?.toLowerCase())) problems.push(`column ${c.schemaName} is listed twice`);
    seen.add(c.schemaName?.toLowerCase());
    if (!Number.isInteger(c.maxLength) || c.maxLength < 1 || c.maxLength > 4000) problems.push(`column ${c.schemaName} needs maxLength 1 to 4000`);
  }
  if (seen.size === 0) problems.push('leadColumns is empty');
  if (problems.length > 0) throw new DefinitionError(problems.join('; '));
}

const label = (text) => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.Label',
  LocalizedLabels: [{ '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: text, LanguageCode: 1033 }],
});

class Dataverse {
  constructor(url, token) {
    this.base = `${url.replace(/\/$/, '')}/api/data/v9.2`;
    this.token = token;
  }

  async request(method, path, { body, headers = {}, allow404 = false } = {}) {
    const response = await fetch(path.startsWith('http') ? path : `${this.base}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'OData-Version': '4.0',
        'OData-MaxVersion': '4.0',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (allow404 && response.status === 404) return null;
    const text = await response.text();
    if (!response.ok) {
      let detail = text.slice(0, 400);
      try { detail = JSON.parse(text)?.error?.message ?? detail; } catch { /* the body was not JSON; keep the raw text */ }
      throw new Error(`Dataverse ${method} ${path.split('?')[0]} failed with ${response.status}: ${detail}`);
    }
    if (text === '') return { entityId: response.headers.get('OData-EntityId') };
    return JSON.parse(text);
  }

  async one(entitySet, filter, select) {
    const q = new URLSearchParams({ $filter: filter, $select: select, $top: '2' });
    const found = await this.request('GET', `${entitySet}?${q}`);
    if (found.value.length > 1) throw new Error(`more than one ${entitySet} matches ${filter}`);
    return found.value[0] ?? null;
  }

  idFrom(created, entitySet) {
    const match = /\(([0-9a-f-]{36})\)$/i.exec(created.entityId ?? '');
    if (!match) throw new Error(`created ${entitySet} but Dataverse returned no id`);
    return match[1];
  }
}

const odataString = (s) => `'${String(s).replace(/'/g, "''")}'`;

export async function apply(def, { url, token, identityClientId, log = console.log }) {
  if (url.replace(/\/$/, '') !== def.environment) throw new Error(`DATAVERSE_URL ${url} is not the environment in the definition (${def.environment})`);
  if (!GUID.test(identityClientId ?? '')) throw new Error('INTAKE_IDENTITY_CLIENT_ID must be a GUID');
  const dv = new Dataverse(url, token);
  const solutionHeader = { 'MSCRM.SolutionUniqueName': def.solution.uniquename };

  // Publisher and solution.
  let publisher = await dv.one('publishers', `uniquename eq ${odataString(def.publisher.uniquename)}`, 'publisherid,customizationprefix');
  if (!publisher) {
    const created = await dv.request('POST', 'publishers', { body: { ...def.publisher } });
    publisher = { publisherid: dv.idFrom(created, 'publisher'), customizationprefix: def.publisher.customizationprefix };
    log(`created publisher ${def.publisher.uniquename}`);
  } else if (publisher.customizationprefix !== def.publisher.customizationprefix) {
    throw new Error(`publisher ${def.publisher.uniquename} exists with prefix ${publisher.customizationprefix}, not ${def.publisher.customizationprefix}`);
  } else log(`publisher ${def.publisher.uniquename} present`);

  const solution = await dv.one('solutions', `uniquename eq ${odataString(def.solution.uniquename)}`, 'solutionid');
  if (!solution) {
    await dv.request('POST', 'solutions', { body: { ...def.solution, 'publisherid@odata.bind': `/publishers(${publisher.publisherid})` } });
    log(`created solution ${def.solution.uniquename}`);
  } else log(`solution ${def.solution.uniquename} present`);

  // Lead columns.
  let columnsAdded = 0;
  for (const column of def.leadColumns) {
    const logical = column.schemaName.toLowerCase();
    const existing = await dv.request('GET', `EntityDefinitions(LogicalName='lead')/Attributes(LogicalName='${logical}')?$select=LogicalName`, { allow404: true });
    if (existing) { log(`column lead.${logical} present`); continue; }
    await dv.request('POST', "EntityDefinitions(LogicalName='lead')/Attributes", {
      headers: solutionHeader,
      body: {
        '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
        AttributeType: 'String',
        AttributeTypeName: { Value: 'StringType' },
        FormatName: { Value: 'Text' },
        MaxLength: column.maxLength,
        SchemaName: column.schemaName,
        DisplayName: label(column.label),
        Description: label(column.description),
        RequiredLevel: { Value: 'None', CanBeChanged: true, ManagedPropertyLogicalName: 'canmodifyrequirementlevelsettings' },
      },
    });
    columnsAdded += 1;
    log(`created column lead.${logical}`);
  }
  if (columnsAdded > 0) {
    await dv.request('POST', 'PublishXml', { body: { ParameterXml: '<importexportxml><entities><entity>lead</entity></entities></importexportxml>' } });
    log('published the lead table');
  }

  // Business unit under the root.
  const root = await dv.one('businessunits', '_parentbusinessunitid_value eq null', 'businessunitid');
  if (!root) throw new Error('no root business unit found');
  let bu = await dv.one('businessunits', `name eq ${odataString(def.businessUnit.name)}`, 'businessunitid');
  if (!bu) {
    const created = await dv.request('POST', 'businessunits', { body: { name: def.businessUnit.name, 'parentbusinessunitid@odata.bind': `/businessunits(${root.businessunitid})` } });
    bu = { businessunitid: dv.idFrom(created, 'business unit') };
    log(`created business unit ${def.businessUnit.name}`);
  } else log(`business unit ${def.businessUnit.name} present`);

  // Security role in that business unit, with exactly the listed privileges added (adding is idempotent).
  let role = await dv.one('roles', `name eq ${odataString(def.role.name)} and _businessunitid_value eq ${bu.businessunitid}`, 'roleid');
  if (!role) {
    const created = await dv.request('POST', 'roles', { headers: solutionHeader, body: { name: def.role.name, 'businessunitid@odata.bind': `/businessunits(${bu.businessunitid})` } });
    role = { roleid: dv.idFrom(created, 'role') };
    log(`created role ${def.role.name}`);
  } else log(`role ${def.role.name} present`);
  const privileges = [];
  for (const name of def.role.privileges) {
    const p = await dv.one('privileges', `name eq ${odataString(name)}`, 'privilegeid');
    if (!p) throw new Error(`privilege ${name} does not exist in this environment`);
    privileges.push({ PrivilegeId: p.privilegeid, Depth: def.role.depth, BusinessUnitId: bu.businessunitid });
  }
  await dv.request('POST', `roles(${role.roleid})/Microsoft.Dynamics.CRM.AddPrivilegesRole`, { body: { Privileges: privileges } });
  log(`role ${def.role.name} holds ${def.role.privileges.join(', ')} at ${def.role.depth} depth`);

  // Application user for the managed identity, in the business unit, holding the role.
  let user = await dv.one('systemusers', `applicationid eq ${identityClientId}`, 'systemuserid,_businessunitid_value');
  if (!user) {
    const created = await dv.request('POST', 'systemusers', {
      body: { applicationid: identityClientId, firstname: def.applicationUser.firstname, lastname: def.applicationUser.lastname, 'businessunitid@odata.bind': `/businessunits(${bu.businessunitid})` },
    });
    user = { systemuserid: dv.idFrom(created, 'application user'), _businessunitid_value: bu.businessunitid };
    log('created the application user for the intake identity');
  } else log('application user for the intake identity present');
  if (user._businessunitid_value !== bu.businessunitid) {
    throw new Error(`the intake application user sits in another business unit; move it to ${def.businessUnit.name} (runbook) and re-run`);
  }
  const held = await dv.request('GET', `systemusers(${user.systemuserid})/systemuserroles_association?$select=roleid&$filter=roleid eq ${role.roleid}`);
  if (held.value.length === 0) {
    await dv.request('POST', `systemusers(${user.systemuserid})/systemuserroles_association/$ref`, { body: { '@odata.id': `${dv.base}/roles(${role.roleid})` } });
    log(`assigned role ${def.role.name} to the intake application user`);
  } else log(`intake application user holds ${def.role.name}`);
}

async function main(argv) {
  const mode = argv[2];
  const def = loadDefinition();
  if (mode === '--validate') { console.log(`definition valid: ${def.leadColumns.length} lead columns, role ${def.role.name}`); return; }
  if (mode !== '--apply') throw new Error('usage: apply.mjs --validate | --apply');
  const { DATAVERSE_URL: url, DATAVERSE_TOKEN: token, INTAKE_IDENTITY_CLIENT_ID: identityClientId } = process.env;
  if (!url || !token || !identityClientId) throw new Error('DATAVERSE_URL, DATAVERSE_TOKEN and INTAKE_IDENTITY_CLIENT_ID must all be set');
  await apply(def, { url, token, identityClientId });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv).catch((err) => {
    console.error(`dataverse apply: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
