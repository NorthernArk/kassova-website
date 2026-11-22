#!/usr/bin/env node
/**
 * Live check of the whole intake path, run by the intake:e2e CI job against the published site:
 *
 *   1. read the form on a live page (default /demo/) and its hidden source and campaign;
 *   2. post a synthetic lead (an @example.com address, which can never receive mail) and expect 303 to /thanks/;
 *   3. read the lead back from Dataverse and check kas_sourcepage, kas_campaign, kas_form and leadsourcecode;
 *   4. delete it, and confirm it is gone;
 *   5. post with the honeypot filled and with a missing consent: both must create nothing.
 *
 * Prints the record id and the source fields only. Writes e2e-report.json for the job artifact.
 * Env: SITE_URL (default https://kassova.com), E2E_PAGE (default /demo/), DATAVERSE_URL, DATAVERSE_TOKEN.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const site = (process.env.SITE_URL ?? 'https://kassova.com').replace(/\/$/, '');
const pagePath = process.env.E2E_PAGE ?? '/demo/';
const api = `${(process.env.DATAVERSE_URL ?? '').replace(/\/$/, '')}/api/data/v9.2`;
const dvHeaders = { Authorization: `Bearer ${process.env.DATAVERSE_TOKEN ?? ''}`, Accept: 'application/json', 'OData-Version': '4.0', 'OData-MaxVersion': '4.0' };

function attr(tag, name) {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

export function readForm(html) {
  const formTag = /<form\b[^>]*class="lead-form"[^>]*>/.exec(html)?.[0];
  if (!formTag) throw new Error('no lead form on the page');
  const action = attr(formTag, 'action');
  if (!action) throw new Error('the lead form has no action: the page was built without the intake endpoint');
  const hidden = {};
  for (const m of html.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g)) {
    const name = attr(m[0], 'name');
    if (name) hidden[name] = attr(m[0], 'value') ?? '';
  }
  for (const key of ['form', 'source', 'campaign']) if (!hidden[key]) throw new Error(`the form has no hidden ${key}`);
  return { action, hidden };
}

async function post(action, fields) {
  const response = await fetch(action, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
  return { status: response.status, location: response.headers.get('location') ?? '' };
}

async function dv(method, path) {
  const response = await fetch(`${api}/${path}`, { method, headers: dvHeaders });
  if (method === 'DELETE' && response.status === 204) return null;
  const text = await response.text();
  if (!response.ok) throw new Error(`Dataverse ${method} ${path.split('?')[0]} failed with ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const leadsFor = (email) =>
  dv('GET', `leads?${new URLSearchParams({ $select: 'leadid,kas_sourcepage,kas_campaign,kas_form,leadsourcecode,kas_intakeid', $filter: `emailaddress1 eq '${email}'` })}`).then((r) => r.value);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForLead(email, attempts = 12) {
  for (let i = 0; i < attempts; i += 1) {
    const found = await leadsFor(email);
    if (found.length > 0) return found;
    await sleep(5000);
  }
  return [];
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  if (!process.env.DATAVERSE_URL || !process.env.DATAVERSE_TOKEN) throw new Error('DATAVERSE_URL and DATAVERSE_TOKEN must be set');
  const pageUrl = `${site}${pagePath}`;
  const page = await fetch(pageUrl);
  expect(page.ok, `${pageUrl} answered ${page.status}`);
  const { action, hidden } = readForm(await page.text());
  expect(new URL(action).hostname.endsWith('.logic.azure.com'), 'the form does not post to an Azure Logic App');

  const stamp = `${Date.now()}`;
  const base = { ...hidden, given_name: 'Intake', family_name: `Check ${stamp}`, company: 'Kassova intake check (synthetic)', role: '', entities: '1-5', message: 'Automated intake check from CI. Synthetic; deleted at once.', consent: 'yes', website: '' };

  // 1. A valid lead.
  const email = `intake-check-${stamp}@example.com`;
  const sent = await post(action, { ...base, email });
  expect(sent.status === 303 && sent.location.startsWith(`${site}/thanks/`), `valid post answered ${sent.status} to ${sent.location || 'nowhere'}`);
  const leads = await waitForLead(email);
  expect(leads.length === 1, `expected one lead for the check address, found ${leads.length}`);
  const lead = leads[0];
  expect(lead.kas_sourcepage === hidden.source, `kas_sourcepage is ${lead.kas_sourcepage}, expected ${hidden.source}`);
  expect(lead.kas_campaign === hidden.campaign, `kas_campaign is ${lead.kas_campaign}, expected ${hidden.campaign}`);
  expect(lead.kas_form === hidden.form, `kas_form is ${lead.kas_form}, expected ${hidden.form}`);
  expect(lead.leadsourcecode === 8, `leadsourcecode is ${lead.leadsourcecode}, expected 8 (Web)`);

  // 2. Remove it, and prove it is gone.
  await dv('DELETE', `leads(${lead.leadid})`);
  expect((await leadsFor(email)).length === 0, 'the check lead is still there after delete');

  // 3. The honeypot and the validator create nothing.
  const trapEmail = `intake-trap-${stamp}@example.com`;
  const trap = await post(action, { ...base, email: trapEmail, website: 'https://example.com' });
  expect(trap.status === 303 && trap.location === `${site}/thanks/`, `honeypot post answered ${trap.status} to ${trap.location}`);
  const invalidEmail = `intake-invalid-${stamp}@example.com`;
  const invalid = await post(action, { ...base, email: invalidEmail, consent: '' });
  expect(invalid.status === 303 && invalid.location.startsWith(`${site}/intake-error/`), `invalid post answered ${invalid.status} to ${invalid.location}`);
  await sleep(15000);
  expect((await leadsFor(trapEmail)).length === 0, 'the honeypot post created a lead');
  expect((await leadsFor(invalidEmail)).length === 0, 'the invalid post created a lead');

  const report = {
    checkedAt: new Date().toISOString(), page: pageUrl, leadId: lead.leadid, intakeRun: lead.kas_intakeid,
    kas_sourcepage: lead.kas_sourcepage, kas_campaign: lead.kas_campaign, kas_form: lead.kas_form, leadsourcecode: lead.leadsourcecode,
    deleted: true, honeypotCreatedNothing: true, invalidCreatedNothing: true,
  };
  writeFileSync('e2e-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(`intake e2e: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
