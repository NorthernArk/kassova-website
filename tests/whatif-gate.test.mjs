import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateWhatIf } from '../infra/lead-intake/whatif-gate.mjs';

test('creates and modifies pass', () => {
  const v = evaluateWhatIf({ status: 'Succeeded', changes: [{ changeType: 'Create', resourceId: 'a' }, { changeType: 'Modify', resourceId: 'b' }] });
  assert.equal(v.ok, true);
  assert.equal(v.summary, '1 Create, 1 Modify');
});

test('a delete or a failed what-if is refused', () => {
  assert.equal(evaluateWhatIf({ status: 'Succeeded', changes: [{ changeType: 'Delete', resourceId: 'x' }] }).ok, false);
  assert.equal(evaluateWhatIf({ status: 'Failed', changes: [] }).ok, false);
});

test('something that is not a what-if report throws', () => {
  assert.throws(() => evaluateWhatIf({}), TypeError);
});
