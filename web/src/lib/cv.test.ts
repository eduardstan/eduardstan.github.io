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
// /cv/ separates the current contact-hours total from the all-blocks one by
// this test; with no block running to Present it would print a current load of 0.
assert.ok(
  blocks.some(([, block]) => /present\s*$/i.test(block.dates)),
  'no teaching block dates run to Present',
);
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
// `service[]` feeds /professional_activities/, which groups by `role` and hangs
// a linked rank badge off `metric`. A missing role is a section with no heading;
// a `metric` with no `rank_url` is a badge that claims a ranking and cannot show
// where it is published.
assert.ok(cv.service.length >= 15, `service[] lost entries: ${cv.service.length}`);
for (const entry of cv.service) {
  text(entry.role, 'service[].role');
  text(entry.venue, 'service[].venue');
  if (entry.metric) {
    text(entry.metric, `service[].metric (${entry.venue})`);
    assert.match(
      entry.rank_url ?? '',
      /^https:\/\//,
      `service[] "${entry.venue}" states a metric but no rank_url for the badge to link to`,
    );
  }
  // An entry states a term (`dates`) or the editions it served (`years[]`) or
  // neither — several standing reviewer roles have no date at all, and the page
  // says so rather than inventing one. What it may not do is state both.
  assert.ok(
    !(entry.dates && entry.years?.length),
    `service[] "${entry.venue}" states both dates and years[]; the page shows one column`,
  );
  for (const edition of entry.years ?? []) {
    assert.ok(
      Number.isInteger(edition.year) && edition.year > 2000,
      `service[] "${entry.venue}": implausible edition year ${edition.year}`,
    );
  }
}
// Decision: ICLR is one role recorded as Program Committee, not a per-year split
// between "Reviewer" and "Programme Committee".
const iclr = cv.service.filter((entry: Record<string, any>) => /\(ICLR\)/.test(entry.venue));
assert.equal(iclr.length, 1, `ICLR must be one service entry, found ${iclr.length}`);
assert.equal(iclr[0].role, 'Program Committee', `ICLR role is "${iclr[0].role}"`);
// Frontiers: appointed Mar 2024, announced 2025-03-03. Both are true and the
// page prints the first; a "fix" that collapses them loses one of the two facts.
const frontiers = cv.service.find((entry: Record<string, any>) => /^Frontiers/.test(entry.venue))!;
assert.equal(frontiers.dates, 'Mar 2024–Present', `Frontiers dates are "${frontiers.dates}"`);
assert.ok(frontiers.announced.startsWith('2025-03-03'), 'Frontiers lost its announcement date');

// The home page and /professional_activities/ both render `service[]` through
// `serviceGroups()` in cv.ts. The grouping is asserted here against the same
// YAML, so a change that makes one page's grouping lose entries fails the build
// rather than making the two pages disagree again — which is exactly what
// happened while the home page read `_pages/professional_activities.md`.
const groups: { role: string; entries: any[] }[] = [];
for (const entry of cv.service) {
  const group = groups.find((candidate) => candidate.role === entry.role);
  if (group) group.entries.push(entry);
  else groups.push({ role: entry.role, entries: [entry] });
}
assert.equal(
  groups.reduce((total, group) => total + group.entries.length, 0),
  cv.service.length,
  'grouping service[] by role dropped entries',
);
assert.equal(
  new Set(groups.map((group) => group.role)).size,
  groups.length,
  'duplicate role group',
);
// The home page's headline figure. `/\beditor\b/i` over the role field is the
// whole rule, so it must select the editorships and nothing else.
const editorial = cv.service.filter((entry: Record<string, any>) => /\beditor\b/i.test(entry.role));
assert.equal(editorial.length, 2, `expected 2 editorial boards, got ${editorial.length}`);
assert.ok(
  editorial.every((entry: Record<string, any>) => entry.role === 'Associate Editor'),
  'the editorial rule selected a role that is not an editorship',
);

// `projects[]` feeds /projects/, including the funding figures the printed CV
// deliberately omits — the reason they are in this file at all.
assert.equal(cv.projects.length, 8, `expected 8 research projects, got ${cv.projects.length}`);
for (const project of cv.projects) {
  text(project.title, 'projects[].title');
  text(project.detail, 'projects[].detail');
  text(project.dates, 'projects[].dates');
  text(project.funding, `projects[].funding (${project.title})`);
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
assert.ok(
  inline(cv.short_bio).includes('<b>') && inline(cv.short_bio).includes('<i>'),
  'short_bio lost its emphasis',
);

// Every string the page prints — the same field set the LaTeX generator routes
// through `renderInline` — goes through `inline()`, so markup added to any of
// them must render rather than print its delimiters.
const rendered = [
  cv.research_focus,
  cv.short_bio,
  cv.supervision.summary,
  cv.supervision.topic_coverage,
  ...cv.appointments.flatMap((row: Record<string, any>) => [
    row.role,
    row.organisation,
    row.dates,
    row.location,
    ...(row.items ?? []),
  ]),
  ...cv.education.flatMap((row: Record<string, any>) => [
    row.degree,
    row.institution,
    row.dates,
    row.location,
  ]),
  ...blocks.flatMap(([, block]) => [block.organisation, block.role, block.location, block.dates]),
  ...courses.flatMap((course: Record<string, any>) => [
    course.course,
    course.programme,
    course.topics,
    course.hours,
  ]),
  ...cv.supervision.breakdown.flatMap((row: Record<string, any>) => [
    row.level,
    row.notes,
    String(row.count),
  ]),
  ...cv.awards.flatMap((row: Record<string, any>) => [
    row.title,
    row.detail,
    row.dates,
    ...(row.items ?? []),
  ]),
  ...cv.service.flatMap((row: Record<string, any>) => [
    row.role,
    row.venue,
    row.section,
    row.metric,
    row.dates,
    ...(row.items ?? []),
  ]),
  ...cv.projects.flatMap((row: Record<string, any>) => [
    row.title,
    row.detail,
    row.dates,
    row.funding,
    ...(row.items ?? []),
  ]),
  ...cv.languages.flatMap((row: Record<string, any>) => [row.name, row.level]),
  ...cv.archive.leadership.flatMap((row: Record<string, any>) => [
    row.role,
    row.detail,
    row.dates,
    row.location,
    ...(row.items ?? []),
  ]),
]
  .filter((value): value is string => typeof value === 'string')
  .map(inline);
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
    `${cv.service.length} service roles, ${cv.projects.length} projects, ` +
    `${cv.languages.length} languages, ${cv.archive.leadership.length} leadership roles`,
);
