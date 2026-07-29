/**
 * Self-check for the consistency gate, against the repository's real data.
 *
 *   cd web && node --experimental-strip-types src/lib/consistency.test.ts
 *
 * Three consumers read one verdict: the page renders it, `astro:build:done`
 * throws on it, and this asserts on it in ~200ms without a full build. The
 * assertion that matters is the first one — the branch is publishable — and the
 * rest guard the properties the gate's usefulness rests on: that it fires on a
 * real contradiction, that an exception excuses exactly one fact and expires,
 * and that it stays silent on a fresh copy of this template.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  CHECKS,
  consistency,
  coverage,
  exceptionProblem,
  report,
  restoreRejectedFindings,
} from './consistency.ts';
import { SOURCES } from './record.ts';

const gate = consistency();

// The branch is publishable. This is the assertion `astro build` also makes.
assert.deepEqual(gate.contradictions, [], report(gate));
assert.deepEqual(gate.exceptionProblems, [], report(gate));

// The gate is not decorative: it says how much it looked at, and it looked.
assert.ok(gate.comparisons > 10, `only ${gate.comparisons} comparisons made`);
assert.match(coverage(gate), /\d+ comparisons/);

// The Frontiers pair — appointed Mar 2024, announced 2025-03-03 — is correct and
// excused, not fixed. Both dates are true and both are stated in the file.
assert.equal(gate.excused.length, 1, 'expected exactly one excused finding');
const [frontiers] = gate.excused;
assert.match(frontiers.subject, /Frontiers/);
assert.equal(frontiers.check, 'announced-in-own-year');
assert.ok(frontiers.excused!.because.length > 20, 'an excuse with no reason is a lie in public');
// Both sides, with a line to go to. An error message that makes the reader hunt
// is an error message that gets the gate switched off.
assert.equal(frontiers.sides.length, 2);
for (const side of frontiers.sides) assert.match(side.source, /^cv\/cv\.yaml:\d+$/);

// Exceptions expire. Read the same data on a day past the `until` and the
// finding comes back as a contradiction, with the expiry named.
const expired = consistency('2027-06-01');
assert.equal(expired.excused.length, 0, 'an expired exception still excused a finding');
assert.equal(expired.contradictions.length, 1, 'the excused finding did not come back');
assert.match(expired.exceptionProblems[0].why, /expired on 2027-01-01/);
assert.match(report(expired), /Build refused/);
// The failure message hands over its own escape hatch.
assert.match(report(expired), /except:\n\s+- check: announced-in-own-year/);

const bibliographyContradiction = {
  ...frontiers,
  subject: 'paper-key "A paper"',
  source: SOURCES.bibliography,
  exceptionSource: undefined,
  excused: undefined,
};
const bibliographyReport = report({
  ...gate,
  contradictions: [bibliographyContradiction],
  excused: [],
});
assert.match(bibliographyReport, /this record has no exception mechanism/);
assert.doesNotMatch(bibliographyReport, /except:\n/);

// The rules the gate enforces on an exception itself. A typo must never look
// like a successful excuse.
const ok = { check: CHECKS[0].id, because: 'both of these dates are correct', until: '2099-01-01' };
assert.equal(exceptionProblem(ok, 'subject', '2026-01-01'), undefined);
assert.match(exceptionProblem({ ...ok, check: 'no-such-check' }, 's', '2026-01-01')!, /no check/);
assert.match(exceptionProblem({ ...ok, because: 'typo' }, 's', '2026-01-01')!, /no reason/);
assert.match(exceptionProblem({ ...ok, until: 'soon' }, 's', '2026-01-01')!, /no expiry/);
assert.match(exceptionProblem({ ...ok, until: '2027-13-40' }, 's', '2026-01-01')!, /no expiry/);
assert.match(exceptionProblem({ ...ok, until: '2027-02-29' }, 's', '2026-01-01')!, /no expiry/);
assert.equal(exceptionProblem({ ...ok, until: '2028-02-29' }, 's', '2026-01-01'), undefined);
assert.match(exceptionProblem({ ...ok, until: '2025-01-01' }, 's', '2026-01-01')!, /expired/);
assert.equal(exceptionProblem({ ...ok, until: 'permanent' }, 's', '2026-01-01'), undefined);

const multiExcused = [
  { ...frontiers, subject: `${frontiers.subject} 2025` },
  { ...frontiers, subject: `${frontiers.subject} 2026` },
];
const restored: typeof multiExcused = [];
restoreRejectedFindings(multiExcused, restored, frontiers.subject, frontiers.check);
assert.equal(multiExcused.length, 0, 'a rejected entry exception still excused an edition');
assert.equal(restored.length, 2, 'not every edition finding came back');
assert.ok(restored.every((finding) => finding.excused === undefined));

// It cannot fire on a fresh copy of this template. Every comparison needs two
// hand-typed records of one fact; a fresh copy has one — a date — and no second
// one to disagree with it. This is a property of the design, not a threshold:
// with no `announced:` anywhere there is nothing to compare, so nothing fires.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const second = (path: string, pattern: RegExp) =>
  (readFileSync(root + path, 'utf8').match(pattern) ?? []).length;
assert.equal(
  gate.comparisons + gate.uncomparable.length,
  second(SOURCES.cv, /^\s*announced:/gm) + second(SOURCES.bibliography, /^\s*announced\s*=/gm),
  'the gate compared something no second record was written for',
);

console.log(
  `ok — ${coverage(gate)}; ${gate.stale.length} stale exceptions, ` +
    `${gate.uncomparable.length} uncomparable`,
);
