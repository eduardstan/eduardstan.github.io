/**
 * Self-check for the CV reader and the inline markup renderer.
 *
 *   cd web && node --experimental-strip-types src/lib/cv.test.ts
 *
 * `src/lib/cv.ts` itself cannot be imported here: it reads the YAML through
 * Vite's `?raw`, which only exists inside a Vite/Astro build. So the shape it
 * declares is asserted against the real `content/cv.yaml` instead — which is the
 * failure being guarded against anyway ("the file changed and the page now
 * renders blanks"), and the reader's own two-line body is checked as text. The
 * pure half of the module lives in `cv-schema.ts` and IS imported, because
 * everything that reads the file under plain node shares it.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { inline } from './inline.ts';
import {
  editionYear,
  entriesOf,
  groupByTitle,
  isEditorial,
  noteOf,
  sections,
  type CV,
  type Entry,
} from './cv-schema.ts';
import { SOURCES } from './record.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));

// ------------------------------------------------------------- the reader ---

// `readFileSync(new URL(..., import.meta.url))` builds and then fails at
// prerender with ENOENT, because Astro relocates the module into
// dist/.prerender/ and the relative path follows the bundle. This has already
// cost one build cycle; the guard is cheaper than the next one.
const reader = readFileSync(fileURLToPath(new URL('./cv.ts', import.meta.url)), 'utf8');
assert.match(reader, /content\/cv\.yaml\?raw/, 'cv.ts must read the YAML through Vite `?raw`');
assert.doesNotMatch(
  reader,
  /readFileSync\(|new URL\(/,
  'cv.ts must not resolve cv.yaml from import.meta.url — it fails at prerender',
);
assert.equal(SOURCES.cv, 'content/cv.yaml', 'the CV source is registered in SOURCES');

// --------------------------------------------------------------- the data ---

const cv = parse(readFileSync(root + SOURCES.cv, 'utf8')) as CV;

const text = (value: unknown, what: string) =>
  assert.ok(
    typeof value === 'string' && value.trim().length > 0,
    `${what}: not a non-empty string`,
  );

// -------------------------------------------------------------- profile -----
// Everything the site's masthead, footer and front page are built from, and the
// four fields the printed CV's header block is built from. A missing one is a
// silently blank line at the top of both.
const { profile } = cv;
text(profile.name, 'profile.name');
text(profile.headline, 'profile.headline');
text(profile.place, 'profile.place');
text(profile.email, 'profile.email');
text(profile.bio?.short, 'profile.bio.short');
text(profile.bio?.long, 'profile.bio.long');
text(profile.focus, 'profile.focus');
text(profile.footer, 'profile.footer');
text(profile.portrait, 'profile.portrait');

// `affiliation` is a LIST because a cross-appointment is a list. The printed
// header sets the primary one and nothing here assumes a single employer.
assert.ok(Array.isArray(profile.affiliation), 'profile.affiliation must be a list');
assert.ok(profile.affiliation!.length > 0, 'profile.affiliation is empty');
for (const entry of profile.affiliation!) text(entry.label, 'profile.affiliation[].label');

// `links` holds IDs, not URLs. The four address templates live once in
// `record.ts` and once in `scripts/build-cv-data.mjs`; a URL here would be a
// third copy and would render as its own label in the footer.
for (const [kind, id] of Object.entries(profile.links ?? {})) {
  text(id, `profile.links.${kind}`);
  assert.doesNotMatch(id!, /^https?:\/\//, `profile.links.${kind} is a URL, not an ID`);
}

// -------------------------------------------------------------- sections ----
// Every top-level list is a section by construction, in both readers. The
// generator names none of them and neither does this: what is asserted is that
// the sections the website has routes for are present and shaped.
const named = sections(cv).map(([key]) => key);
for (const key of [
  'appointments',
  'education',
  'teaching',
  'supervision',
  'awards',
  'service',
  'projects',
  'languages',
  'leadership',
])
  assert.ok(named.includes(key), `content/cv.yaml lost the ${key} section`);

// One entry shape, one required field, everywhere.
for (const [key, section] of sections(cv)) {
  for (const entry of entriesOf(section)) {
    text(entry.title, `${key}[].title`);
  }
}

const appointments = entriesOf(cv.appointments);
const education = entriesOf(cv.education);
const teaching = entriesOf(cv.teaching);
const supervision = entriesOf(cv.supervision);
const awards = entriesOf(cv.awards);
const service = entriesOf(cv.service);
const projects = entriesOf(cv.projects);
const languages = entriesOf(cv.languages);
const leadership = entriesOf(cv.leadership);

for (const entry of [...appointments, ...education]) {
  text(entry.org, 'appointments/education[].org');
  text(entry.dates, 'appointments/education[].dates');
}

// A `rows:` table is the entry's own keys, in the order they are written, and
// that order IS the column order of the same table in the printed CV. Reordering
// two keys reorders two columns, silently, so the key set is asserted here.
const courses = teaching.flatMap((block) => block.rows ?? []);
assert.ok(teaching.length >= 3, 'teaching lost an entry');
for (const block of teaching) {
  text(block.org, 'teaching[].org');
  text(block.dates, 'teaching[].dates');
  assert.ok((block.rows ?? []).length > 0, `teaching "${block.org}": no rows`);
  for (const row of block.rows ?? [])
    assert.deepEqual(
      Object.keys(row),
      ['course', 'programme / Level', 'key topics', 'hours'],
      `teaching "${block.org}": row keys are the printed table's columns, in this order`,
    );
}
// /cv/ separates the current contact-hours total from the all-posts one by this
// test; with no post running to Present it would print a current load of 0.
assert.ok(
  teaching.some((block) => /present\s*$/i.test(block.dates ?? '')),
  'no teaching post dates run to Present',
);
for (const row of courses) {
  // The page sums the leading number of this column into a contact-hours total,
  // so a value that stopped starting with a number would print NaN.
  assert.ok(
    Number.isFinite(parseInt(row.hours, 10)),
    `${row.course}: hours "${row.hours}" does not start with a number`,
  );
}

// A section written as a map: a `note` above its `entries`.
assert.equal(noteOf(cv.supervision).length, 2, 'supervision lost a note paragraph');
for (const row of supervision) {
  text(row.detail, 'supervision.entries[].detail');
  // "1" is quoted in the file precisely so it stays a string; "10+" is not a
  // number at all. Either way the page prints it verbatim.
  text(String(row.count), 'supervision.entries[].count');
  assert.deepEqual(
    Object.keys(row),
    ['title', 'count', 'detail'],
    "supervision entry keys are the printed table's columns, in this order",
  );
}

for (const award of awards) text(award.detail, 'awards[].detail');

// `service[]` feeds /professional_activities/, which groups by `title` and hangs
// a linked rank badge off `metric`. A `metric` with no `rank_url` is a badge that
// claims a ranking and cannot show where it is published.
assert.ok(service.length >= 15, `service[] lost entries: ${service.length}`);
for (const entry of service) {
  text(entry.org, 'service[].org');
  if (entry.metric) {
    assert.match(
      entry.rank_url ?? '',
      /^https:\/\//,
      `service[] "${entry.org}" states a metric but no rank_url for the badge to link to`,
    );
  }
  // An entry states a term (`dates`) or the editions it served (`years[]`) or
  // neither — several standing reviewer roles have no date at all, and the page
  // says so rather than inventing one. What it may not do is state both.
  assert.ok(
    !(entry.dates && entry.years?.length),
    `service[] "${entry.org}" states both dates and years[]; the page shows one column`,
  );
  // An edition is a bare year, or a map when it carries an announcement date.
  // The common case does not pay for the rare one.
  for (const edition of entry.years ?? []) {
    const year = editionYear(edition);
    assert.ok(
      Number.isInteger(year) && year > 2000,
      `service[] "${entry.org}": implausible edition year ${year}`,
    );
    if (typeof edition === 'object')
      assert.ok(
        edition.announced,
        `service[] "${entry.org}" ${year}: a map with no announced date`,
      );
  }
}
// Decision: ICLR is one role recorded as Program Committee, not a per-year split
// between "Reviewer" and "Programme Committee".
const iclr = service.filter((entry) => /\(ICLR\)/.test(entry.org ?? ''));
assert.equal(iclr.length, 1, `ICLR must be one service entry, found ${iclr.length}`);
assert.equal(iclr[0].title, 'Program Committee', `ICLR role is "${iclr[0].title}"`);
// Frontiers: appointed Mar 2024, announced 2025-03-03. Both are true and the
// page prints the first; a "fix" that collapses them loses one of the two facts.
const frontiers = service.find((entry) => /^Frontiers/.test(entry.org ?? ''))!;
assert.equal(frontiers.dates, 'Mar 2024–Present', `Frontiers dates are "${frontiers.dates}"`);
assert.ok(frontiers.announced!.startsWith('2025-03-03'), 'Frontiers lost its announcement date');

// The home page and /professional_activities/ both render `service[]` through
// `groupByTitle()`. The grouping is asserted here against the same YAML, so a
// change that makes one page's grouping lose entries fails the build rather than
// making the two pages disagree again.
const groups = groupByTitle(service);
assert.equal(
  groups.reduce((total, group) => total + group.entries.length, 0),
  service.length,
  'grouping service[] by title dropped entries',
);
assert.equal(
  new Set(groups.map((group) => group.role)).size,
  groups.length,
  'duplicate role group',
);
// The home page's headline figure. `/\beditor\b/i` over the title field is the
// whole rule, so it must select the editorships and nothing else.
const editorial = service.filter((entry) => isEditorial(entry.title));
assert.equal(editorial.length, 2, `expected 2 editorial boards, got ${editorial.length}`);
assert.ok(
  editorial.every((entry) => entry.title === 'Associate Editor'),
  'the editorial rule selected a role that is not an editorship',
);

// `projects[]` feeds /projects/, including the funding figures the printed CV
// deliberately omits — the reason they are in this file at all.
assert.equal(projects.length, 8, `expected 8 research projects, got ${projects.length}`);
for (const project of projects) {
  text(project.detail, 'projects[].detail');
  text(project.dates, 'projects[].dates');
  text(project.funding, `projects[].funding (${project.title})`);
}

for (const language of languages) text(language.detail, 'languages[].detail');
for (const role of leadership) text(role.detail, 'leadership[].detail');

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
  inline(profile.bio!.short!).includes('<b>') && inline(profile.bio!.short!).includes('<i>'),
  'profile.bio.short lost its emphasis',
);

// Every string the page prints — the same field set the LaTeX generator routes
// through `renderInline` — goes through `inline()`, so markup added to any of
// them must render rather than print its delimiters. Because there is one entry
// shape, this is now every value of every entry of every section, with no list
// of field names to fall behind the file.
const stringsOf = (entry: Entry): unknown[] => [
  ...Object.values(entry).filter((value) => typeof value === 'string'),
  ...(entry.items ?? []),
  ...(entry.rows ?? []).flatMap((row) => Object.values(row)),
];
const rendered = [
  profile.bio!.short,
  profile.bio!.long,
  profile.focus,
  profile.footer,
  ...sections(cv).flatMap(([, section]) => [
    ...noteOf(section),
    ...entriesOf(section).flatMap(stringsOf),
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
  `ok — ${sections(cv).length} sections: ${appointments.length} appointments, ` +
    `${education.length} degrees, ${teaching.length} teaching posts / ${courses.length} courses, ` +
    `${supervision.length} supervision rows, ${awards.length} awards, ` +
    `${service.length} service roles, ${projects.length} projects, ` +
    `${languages.length} languages, ${leadership.length} leadership roles`,
);
