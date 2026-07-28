/**
 * Self-check for the record readers. Everything the Ledger design displays as a
 * count or a source line comes from these functions, so the cheapest guard that
 * catches a broken parse lives here.
 *
 *   cd web && npx tsx src/lib/record.test.ts
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

// Fields the index columns depend on.
for (const entry of bib.entries) {
  assert.ok(entry.title, `${entry.key}: no title`);
  assert.ok(entry.year > 1990, `${entry.key}: implausible year ${entry.year}`);
  assert.ok(entry.authors.length > 0, `${entry.key}: no authors`);
  assert.ok(!/[{}\\]/.test(entry.title), `${entry.key}: unresolved LaTeX in title`);
  assert.ok(
    !entry.authors.some((a) => /[{}\\]/.test(a)),
    `${entry.key}: unresolved LaTeX in authors`,
  );
}

// Accents and particles: the two cases a naive parser gets wrong.
const authors = bib.entries.flatMap((entry) => entry.authors);
assert.ok(authors.includes('E. Muñoz-Velasco'), 'LaTeX accent not resolved in author names');
assert.ok(authors.includes('D. Della Monica'), 'surname particle was initialised away');
assert.ok(authors.includes('I. E. Stan'), 'author name not normalised to initials');

// The feed, its defects, and the derived gap.
const feed = news();
assert.ok(feed.items.length > 0, 'no news items parsed');
const excluded = feed.defects.filter((defect) => defect.excluded).length;
assert.equal(feed.items.length + excluded, feed.fileCount, 'items + excluded files ≠ files read');
assert.ok(excluded > 0, 'the known duplicated news file was not detected');
for (const gap of bibliographyGaps()) {
  assert.ok(gap.title.length > 10, `implausible gap title: ${gap.title}`);
}

// About and activities.
assert.ok(about().paragraphs.length >= 3, 'about section did not parse');
const sections = activities().sections;
assert.ok(sections.length >= 3, 'activities sections did not parse');
assert.ok(
  sections.some((section) => section.entries.some((entry) => entry.rank)),
  'no ranks parsed from the activities page',
);

console.log(
  `ok — ${bib.entries.length} entries, ${feed.items.length} news items, ` +
    `${feed.defects.length} defects, ${bibliographyGaps().length} gaps, ` +
    `${sections.length} activity sections`,
);
