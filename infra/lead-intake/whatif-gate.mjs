#!/usr/bin/env node
/**
 * The deploy gate. Reads the JSON of `az deployment group what-if --no-pretty-print -o json` and refuses to go on
 * when the deployment would delete anything or the what-if did not succeed. Exit 0: safe. Exit 1: refused, with
 * the resource ids. Exit 2: the file is not a what-if result, which also stops the deploy.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function evaluateWhatIf(result) {
  if (typeof result !== 'object' || result === null || !Array.isArray(result.changes)) throw new TypeError('the report has no changes list');
  const refusals = [];
  if (typeof result.status === 'string' && result.status !== 'Succeeded') refusals.push(`the what-if status is ${result.status}`);
  const counts = {};
  for (const change of result.changes) {
    const type = String(change?.changeType ?? 'Unknown');
    counts[type] = (counts[type] ?? 0) + 1;
    if (type === 'Delete') refusals.push(`would delete ${String(change.resourceId ?? 'an unnamed resource')}`);
  }
  const summary = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([t, n]) => `${n} ${t}`).join(', ') || 'no changes';
  return { ok: refusals.length === 0, refusals, summary };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const path = process.argv[2];
  let verdict;
  try {
    verdict = evaluateWhatIf(JSON.parse(readFileSync(path, 'utf8')));
  } catch (err) {
    console.error(`what-if gate: cannot read ${path}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
  console.log(`what-if: ${verdict.summary}`);
  if (!verdict.ok) {
    for (const r of verdict.refusals) console.error(`refused: ${r}`);
    process.exit(1);
  }
}
