/**
 * Self-check for the record readers. Everything the Ledger design displays as a
 * count or a source line comes from these functions, so the cheapest guard that
 * catches a broken parse lives here.
 *
 *   cd web && node --experimental-strip-types src/lib/record.test.ts
 *
 * It asserts against the repository's real data files, not fixtures, because the
 * failure this is protecting against is exactly "the parser stopped agreeing
 * with the data".
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { about, activities, bibliography, bibliographyGaps, news, SOURCES } from './record.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const bib = bibliography();

// The count the page shows must be the count in the file.
const grepped = readFileSync(root + SOURCES.bibliography, 'utf8').match(/^@/gm)!.length;
assert.equal(bib.entries.length, grepped, 'entry count disagrees with `grep -c "^@"`');

// Fields the index columns depend on. Nothing is filtered: every entry in the
// file is shown, including manuscripts under review and released software, so
// each one has to survive the parse intact.
for (const entry of bib.entries) {
  assert.ok(entry.title, `${entry.key}: no title`);
  assert.ok(entry.year > 1990, `${entry.key}: implausible year ${entry.year}`);
  assert.ok(entry.authors.length > 0, `${entry.key}: no authors`);
  assert.ok(entry.venue, `${entry.key}: no venue`);
  assert.ok(entry.kind !== 'Other', `${entry.key}: unlabelled entry type @${entry.type}`);
  assert.ok(!/[{}\\]/.test(entry.title), `${entry.key}: unresolved LaTeX in title`);
  assert.ok(
    !entry.authors.some((a) => /[{}\\]/.test(a)),
    `${entry.key}: unresolved LaTeX in authors`,
  );
  assert.ok(entry.raw.startsWith('@') && entry.raw.endsWith('}'), `${entry.key}: raw not captured`);
}

// Accents, particles and both BibTeX name forms — the cases a naive parser gets
// wrong. `Stan, Ionel Eduard` read as `First Last` yields `S. I. Eduard`.
const authors = bib.entries.flatMap((entry) => entry.authors);
assert.ok(authors.includes('E. Muñoz-Velasco'), 'LaTeX accent not resolved in author names');
assert.ok(authors.includes('D. Della Monica'), 'surname particle was initialised away');
assert.ok(authors.includes('I. E. Stan'), 'author name not normalised to initials');
assert.ok(
  !authors.some((author) => /\b(Eduard|Ionel)$/.test(author)),
  '`Last, First` names were read as `First Last`',
);

// The feed, its defects, and the derived gap.
const feed = news();
assert.ok(feed.items.length > 0, 'no news items parsed');
const excluded = feed.defects.filter((defect) => defect.excluded).length;
assert.equal(feed.items.length + excluded, feed.fileCount, 'items + excluded files ≠ files read');
assert.ok(excluded > 0, 'the known duplicated news file was not detected');
for (const gap of bibliographyGaps()) {
  assert.ok(gap.title.length > 10, `implausible gap title: ${gap.title}`);
}

// About and activities. Prettier runs over the source markdown and spells
// emphasis `_like this_`, so both markers have to render — and neither may fire
// on an underscore inside a word.
const bio = about();
assert.ok(bio.paragraphs.length >= 3, 'about section did not parse');
assert.ok(
  !bio.paragraphs.some((paragraph) => /[*_]{1,2}\w/.test(paragraph)),
  'unrendered markdown emphasis left in the about paragraphs',
);
assert.ok(
  bio.paragraphs.some((paragraph) => paragraph.includes('<i>')),
  'no emphasis rendered from the about page',
);
assert.ok(!/[*_]/.test(bio.firstPerson), 'markdown markers left in the first-person line');
const sections = activities().sections;
assert.ok(sections.length >= 3, 'activities sections did not parse');
const ranks = sections.flatMap((section) => section.entries.flatMap((entry) => entry.rank ?? []));
assert.ok(ranks.length > 0, 'no ranks parsed from the activities page');
// `A\*` is how the source writes the CORE rank A*; the backslash is markup.
assert.ok(ranks.includes('A*'), 'markdown backslash escape left in a rank');
assert.ok(
  !sections.some((section) =>
    section.entries.some((entry) => /[\\*_]/.test(entry.name + (entry.rankNote ?? ''))),
  ),
  'markdown markers left in an activity name or rank note',
);

console.log(
  `ok — ${bib.entries.length} entries, ${feed.items.length} news items, ` +
    `${feed.defects.length} defects, ${bibliographyGaps().length} gaps, ` +
    `${sections.length} activity sections`,
);
