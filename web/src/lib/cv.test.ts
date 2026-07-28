/**
 * Self-check for the CV reader and the inline markup renderer.
 *
 *   cd web && node --experimental-strip-types src/lib/cv.test.ts
 *
 * `src/lib/cv.ts` itself cannot be imported here: it reads the YAML through
 * Vite's `?raw`, which only exists inside a Vite/Astro build. So the shape it
 * declares is asserted against the real `cv/cv.yaml` instead — which is the
 * failure being guarded against anyway ("the file changed and the page now
 * renders blanks"), and the reader's own two-line body is checked as text.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { inline } from './inline.ts';
import { SOURCES } from './record.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));

// ------------------------------------------------------------- the reader ---

// `readFileSync(new URL(..., import.meta.url))` builds and then fails at
// prerender with ENOENT, because Astro relocates the module into
// dist/.prerender/ and the relative path follows the bundle. This has already
// cost one build cycle; the guard is cheaper than the next one.
const reader = readFileSync(fileURLToPath(new URL('./cv.ts', import.meta.url)), 'utf8');
assert.match(reader, /cv\/cv\.yaml\?raw/, 'cv.ts must read the YAML through Vite `?raw`');
assert.doesNotMatch(
  reader,
  /readFileSync\(|new URL\(/,
  'cv.ts must not resolve cv.yaml from import.meta.url — it fails at prerender',
);
assert.equal(SOURCES.cv, 'cv/cv.yaml', 'the CV source is registered in SOURCES');

// --------------------------------------------------------------- the data ---

const cv = parse(readFileSync(root + SOURCES.cv, 'utf8'));

// Every field /cv/ renders. A missing one is a silently blank section.
const text = (value: unknown, what: string) =>
  assert.ok(
    typeof value === 'string' && value.trim().length > 0,
    `${what}: not a non-empty string`,
  );

text(cv.research_focus, 'research_focus');
text(cv.short_bio, 'short_bio');

for (const appointment of cv.appointments) {
  text(appointment.role, 'appointments[].role');
  text(appointment.organisation, 'appointments[].organisation');
  text(appointment.dates, 'appointments[].dates');
}
for (const degree of cv.education) {
  text(degree.degree, 'education[].degree');
  text(degree.institution, 'education[].institution');
  text(degree.dates, 'education[].dates');
}

const blocks = Object.entries(cv.teaching) as [string, Record<string, any>][];
assert.ok(blocks.length >= 3, 'teaching lost a block');
const courses = blocks.flatMap(([, block]) => block.courses);
for (const [key, block] of blocks) {
  text(block.organisation, `teaching.${key}.organisation`);
  text(block.role, `teaching.${key}.role`);
  text(block.dates, `teaching.${key}.dates`);
  assert.ok(block.courses?.length > 0, `teaching.${key}: no courses`);
}
for (const course of courses) {
  text(course.course, 'course.course');
  text(course.programme, 'course.programme');
  text(course.topics, 'course.topics');
  // The page sums the leading number of this field into a contact-hours total,
  // so a field that stops starting with a number would print NaN.
  assert.ok(
    Number.isFinite(parseInt(course.hours, 10)),
    `${course.course}: hours "${course.hours}" does not start with a number`,
  );
}

text(cv.supervision.summary, 'supervision.summary');
text(cv.supervision.topic_coverage, 'supervision.topic_coverage');
for (const row of cv.supervision.breakdown) {
  text(row.level, 'supervision.breakdown[].level');
  text(row.notes, 'supervision.breakdown[].notes');
  // "1" is quoted in the file precisely so it stays a string; "10+" is not a
  // number at all. Either way the page prints it verbatim.
  text(String(row.count), 'supervision.breakdown[].count');
}

for (const award of cv.awards) {
  text(award.title, 'awards[].title');
  text(award.detail, 'awards[].detail');
}
for (const language of cv.languages) {
  text(language.name, 'languages[].name');
  text(language.level, 'languages[].level');
}
for (const role of cv.archive.leadership) {
  text(role.role, 'archive.leadership[].role');
  text(role.detail, 'archive.leadership[].detail');
}

// --------------------------------------------------------------- the markup ---

assert.equal(inline('**bold**'), '<b>bold</b>');
assert.equal(inline('_italic_'), '<i>italic</i>');
assert.equal(inline('[text](https://example.org/a)'), '<a href="https://example.org/a">text</a>');
assert.equal(inline('a **b _c_ d** e'), 'a <b>b <i>c</i> d</b> e');
assert.equal(inline(undefined), '');

// The two rules the LaTeX generator already settled, and where a regex renderer
// silently goes wrong.
for (const literal of ['a_b', 'snake_case', 'file_name.txt', 'a_b_c_d']) {
  assert.equal(inline(literal), literal, `intra-word underscore was read as emphasis: ${literal}`);
}
assert.equal(inline('CORE Rank: A*'), 'CORE Rank: A*', 'a bare * must pass through');
assert.equal(inline('**[CORE Rank: A*]**'), '<b>[CORE Rank: A*]</b>');

// Nothing in the YAML may become markup of its own.
assert.equal(inline('a & b <i>c</i>'), 'a &amp; b &lt;i&gt;c&lt;/i&gt;');
assert.equal(inline('[x](https://a/"onerror=b)'), '<a href="https://a/&quot;onerror=b">x</a>');

// The real prose: both markers render, and no delimiter survives into the page.
const rendered = [
  cv.research_focus,
  cv.short_bio,
  cv.supervision.summary,
  cv.supervision.topic_coverage,
].map(inline);
assert.ok(
  rendered[1].includes('<b>') && rendered[1].includes('<i>'),
  'short_bio lost its emphasis',
);
for (const html of rendered) {
  assert.doesNotMatch(html, /\*\*/, `unrendered ** left in the page: ${html.slice(0, 60)}`);
  assert.doesNotMatch(
    html,
    /(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])/,
    `unrendered _ left in the page: ${html.slice(0, 60)}`,
  );
}

console.log(
  `ok — ${cv.appointments.length} appointments, ${cv.education.length} degrees, ` +
    `${blocks.length} teaching blocks / ${courses.length} courses, ` +
    `${cv.supervision.breakdown.length} supervision rows, ${cv.awards.length} awards, ` +
    `${cv.languages.length} languages, ${cv.archive.leadership.length} leadership roles`,
);
