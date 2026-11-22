// The contract between the site's form, the Logic App workflow and the Dataverse columns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadDefinition, validateDefinition, DefinitionError } from '../infra/lead-intake/dataverse/apply.mjs';

const workflow = JSON.parse(readFileSync(new URL('../infra/lead-intake/workflow.json', import.meta.url), 'utf8'));
const form = readFileSync(new URL('../src/components/LeadForm.astro', import.meta.url), 'utf8');
const bicep = readFileSync(new URL('../infra/lead-intake/main.bicep', import.meta.url), 'utf8');
const definition = loadDefinition();

/** Every action in the definition, with the scope (sibling names) it lives in and its path. */
function actions(scope = workflow.actions, path = []) {
  const out = [];
  for (const [name, action] of Object.entries(scope)) {
    out.push({ name, action, siblings: Object.keys(scope), path: [...path, name] });
    if (action.actions) out.push(...actions(action.actions, [...path, name]));
    if (action.else?.actions) out.push(...actions(action.else.actions, [...path, name, 'else']));
  }
  return out;
}
const all = actions();
const byName = (n) => all.find((a) => a.name === n);

const formFields = [...form.matchAll(/\sname="([a-z_]+)"/g)].map((m) => m[1]);
const workflowFields = Object.keys(byName('Fields').action.inputs);
const maxlength = (name) => Number(new RegExp(`name="${name}"[^>]*maxlength="(\\d+)"`).exec(form)?.[1] ?? NaN);
const validExpr = byName('Valid').action.inputs;
const upper = (name) => Number(new RegExp(`length\\(outputs\\('Fields'\\)\\?\\['${name}'\\]\\), (\\d+)\\)\\)`).exec(validExpr)?.[1] ?? NaN);

test('the workflow reads exactly the fields the form sends', () => {
  assert.deepEqual([...new Set(formFields)].sort(), [...workflowFields].sort());
});

test('form maxlength never exceeds what the workflow accepts', () => {
  for (const name of ['given_name', 'family_name', 'company', 'role', 'message']) {
    assert.ok(Number.isFinite(maxlength(name)), `${name} has a maxlength`);
    assert.ok(Number.isFinite(upper(name)), `the workflow limits ${name}`);
    assert.ok(maxlength(name) <= upper(name), `${name}: form allows ${maxlength(name)}, workflow ${upper(name)}`);
  }
  assert.ok(validExpr.includes(`lessOrEquals(length(outputs('Fields')?['email']), 254)`));
  assert.equal(maxlength('email'), 254);
});

test('every value written to a kas_ column fits that column', () => {
  const body = byName('Create_lead').action.inputs.body;
  const columns = Object.fromEntries(definition.leadColumns.map((c) => [c.schemaName.toLowerCase(), c.maxLength]));
  for (const key of Object.keys(body).filter((k) => k.startsWith('kas_'))) assert.ok(columns[key], `${key} is defined in definition.json`);
  assert.ok(upper('source') <= columns.kas_sourcepage);
  assert.ok(upper('campaign') <= columns.kas_campaign);
  assert.ok(Math.max(...['demo', 'waitlist', 'talk'].map((s) => s.length)) <= columns.kas_form);
  assert.equal(body.leadsourcecode, 8, 'lead source is Web');
});

test('runAfter only names sibling actions', () => {
  for (const { name, action, siblings } of all) {
    for (const dep of Object.keys(action.runAfter ?? {})) assert.ok(siblings.includes(dep), `${name} runs after unknown ${dep}`);
  }
});

test('the lead is created only past the honeypot, validation and both rate limits', () => {
  assert.deepEqual(byName('Create_lead').path, ['Size_ok', 'Honeypot_empty', 'Is_valid', 'Under_hourly_cap', 'Under_email_cap', 'Create_lead']);
  assert.ok(byName('Respond_trap').path.includes('else'), 'the trap response is the honeypot else branch');
  assert.deepEqual(byName('Honeypot_empty').action.expression, { and: [{ equals: ["@outputs('Fields')?['website']", ''] }] });
  assert.equal(workflow.parameters.maxLeadsPerEmailPerHour.defaultValue, 3);
});

test('every response is a 303 back to the site, never echoing input other than the validated form', () => {
  const responses = all.filter((a) => a.action.type === 'Response');
  assert.ok(responses.length >= 7);
  for (const { name, action } of responses) {
    assert.equal(action.inputs.statusCode, 303, name);
    assert.match(action.inputs.headers.Location, /^@\{parameters\('siteOrigin'\)\}\/(thanks|intake-error)\//, name);
    assert.doesNotMatch(action.inputs.headers.Location.replace("outputs('Fields')?['form']", ''), /outputs\(/, name);
  }
});

test('Dataverse calls use the managed identity and hide their data from run history', () => {
  const http = all.filter((a) => a.action.type === 'Http');
  assert.equal(http.length, 3);
  for (const { name, action } of http) {
    assert.equal(action.inputs.authentication.type, 'ManagedServiceIdentity', name);
    assert.equal(action.inputs.authentication.identity, "@parameters('identityId')", name);
    assert.deepEqual(action.runtimeConfiguration.secureData.properties, ['inputs', 'outputs'], name);
    assert.match(action.inputs.uri, /^@\{parameters\('dataverseUrl'\)\}\/api\/data\/v9\.2\/leads/, name);
  }
  for (const n of ['Parse', 'Fields', 'Valid']) assert.deepEqual(byName(n).action.runtimeConfiguration.secureData.properties, ['inputs', 'outputs'], n);
  assert.deepEqual(workflow.triggers.manual.runtimeConfiguration.secureData.properties, ['inputs', 'outputs']);
});

test('the trigger is rate limited and accepts only POST', () => {
  const t = workflow.triggers.manual;
  assert.equal(t.type, 'Request');
  assert.equal(t.inputs.method, 'POST');
  assert.ok(t.runtimeConfiguration.concurrency.runs <= 10);
  assert.ok(t.runtimeConfiguration.concurrency.maximumWaitingRuns <= 20);
});

test('a failure sends the visitor to the error page and marks the run failed', () => {
  assert.deepEqual(byName('Respond_unavailable').action.runAfter, { Size_ok: ['Failed', 'TimedOut'] });
  assert.equal(byName('Fail_run').action.inputs.runStatus, 'Failed');
});

test('no secret, key or signed URL is in the workflow, the Bicep or the definition', () => {
  const text = JSON.stringify(workflow) + bicep + JSON.stringify(definition);
  assert.doesNotMatch(text, /sig=|client_secret|clientSecret|password|AccountKey|SharedAccessSignature|Bearer [A-Za-z0-9]/i);
  assert.doesNotMatch(bicep, /listCallbackUrl/, 'the callback URL is not a deployment output');
  assert.match(bicep, /loadJsonContent\('workflow\.json'\)/);
});

test('the Dataverse definition validates and rejects a bad one', () => {
  assert.doesNotThrow(() => validateDefinition(definition));
  assert.equal(definition.environment, 'https://dream.crm.dynamics.com');
  assert.throws(() => validateDefinition({ ...definition, leadColumns: [{ schemaName: 'new_x', maxLength: 10 }] }), DefinitionError);
  assert.throws(() => validateDefinition({ ...definition, role: { ...definition.role, depth: 'Everything' } }), DefinitionError);
});
