import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readForm } from '../infra/lead-intake/e2e.mjs';

test('reads the action and the hidden tags of the lead form', () => {
  const html = '<form class="lead-form" id="lead-form" method="post" action="https://x.eastus.logic.azure.com/workflows/1/triggers/manual/paths/invoke?a=1&amp;b=2"><input type="hidden" name="form" value="demo"><input type="hidden" name="source" value="/demo/"><input type="hidden" name="campaign" value="site-demo"></form>';
  const { action, hidden } = readForm(html);
  assert.equal(action, 'https://x.eastus.logic.azure.com/workflows/1/triggers/manual/paths/invoke?a=1&b=2');
  assert.deepEqual(hidden, { form: 'demo', source: '/demo/', campaign: 'site-demo' });
});

test('a page built without the endpoint is reported as such', () => {
  assert.throws(() => readForm('<form class="lead-form" method="post"><input type="hidden" name="form" value="demo"></form>'), /without the intake endpoint/);
});
