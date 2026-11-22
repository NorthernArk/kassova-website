import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditHtml, auditText } from '../scripts/audit-site.mjs';

const ACTION = 'https://prod-01.eastus.logic.azure.com:443/workflows/0123abcd/triggers/manual/paths/invoke?api-version=2016-10-01&amp;sp=%2Ftriggers%2Fmanual%2Frun&amp;sv=1.0&amp;sig=x';
const page = ({ path = '/features/x/', body = '<a href="/demo/">Request a demo</a>', head = '' } = {}) => `<!DOCTYPE html><html lang="en"><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>A page | Kassova</title><meta name="description" content="A description that is long enough to pass the length check here.">
<link rel="canonical" href="https://kassova.com${path}">${head}</head><body><h1>Title</h1>${body}</body></html>`;
const form = (action = ACTION, source = '/go/x/', campaign = 'sq-x') => `<form class="lead-form" method="post" action="${action}"><input type="hidden" name="form" value="demo"><input type="hidden" name="source" value="${source}"><input type="hidden" name="campaign" value="${campaign}"><input name="website" tabindex="-1"><input type="checkbox" name="consent" value="yes" required></form>`;
const run = (path, html, requireEndpoint = false) => auditHtml(path, html, { requireEndpoint }).problems;

test('a clean page passes', () => {
  assert.deepEqual(run('/features/x/', page()), []);
});

test('scripts other than JSON-LD fail; JSON-LD passes', () => {
  assert.equal(run('/features/x/', page({ head: '<script src="https://example.com/a.js"></script>' })).length > 0, true);
  assert.deepEqual(run('/features/x/', page({ head: '<script type="application/ld+json">{"@type":"Thing"}</script>' })), []);
  assert.ok(run('/features/x/', page({ head: '<script type="application/ld+json">{nope</script>' })).some((p) => p.includes('JSON-LD')));
});

test('third-party loads fail', () => {
  assert.ok(run('/features/x/', page({ head: '<link rel="stylesheet" href="https://fonts.example.com/a.css">' })).some((p) => p.includes('another origin')));
  assert.ok(run('/features/x/', page({ body: '<a href="/demo/">x</a><img src="//cdn.example.com/p.gif">' })).some((p) => p.includes('another origin')));
});

test('a form must post to a Logic App, with the honeypot, consent and source tags', () => {
  assert.deepEqual(run('/go/x/', page({ path: '/go/x/', body: form() })), []);
  assert.ok(run('/go/x/', page({ path: '/go/x/', body: form('https://forms.example.com/x') })).some((p) => p.includes('other than an Azure Logic App')));
  assert.ok(run('/go/x/', page({ path: '/go/x/', body: form(ACTION, '/elsewhere/') })).some((p) => p.includes('hidden source')));
  assert.ok(run('/go/x/', page({ path: '/go/x/', body: form().replace(' action="' + ACTION + '"', '') }), true).some((p) => p.includes('release build')));
});

test('squeeze pages have one form and no navigation', () => {
  assert.ok(run('/go/x/', page({ path: '/go/x/', body: '<nav></nav>' + form() })).some((p) => p.includes('navigation')));
  assert.ok(run('/go/x/', page({ path: '/go/x/', body: form() + form() })).some((p) => p.includes('2 forms')));
  assert.ok(run('/go/x/', page({ path: '/go/x/', body: form() + '<a href="/features/">x</a>' })).some((p) => p.includes('links away')));
  assert.ok(run('/go/x/', page({ path: '/go/x/', body: form(ACTION, '/go/x/', 'site-demo') })).some((p) => p.includes('sq-')));
});

test('indexable pages need a call to action', () => {
  assert.ok(run('/features/x/', page({ body: '<p>No way in.</p>' })).some((p) => p.includes('call to action')));
});

test('banned content is caught and the form action is ignored', () => {
  assert.equal(auditText('/a/', 'Plans from $49 per month').length > 0, true);
  assert.equal(auditText('/a/', 'Sign in to your account').length > 0, true);
  assert.equal(auditText('/a/', 'Use our API').length > 0, true);
  assert.equal(auditText('/a/', 'see app.kassova.com').length > 0, true);
  assert.equal(auditText('/a/', 'a seamless experience').length > 0, true);
  assert.deepEqual(auditText('/a/', 'The IRS describes this under transfer pricing (irs.gov/transfer-pricing). A capital call.'), []);
  assert.deepEqual(auditText('/a/', `<form action="${ACTION}"></form>`), []);
});
