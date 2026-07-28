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

for (const key of ['DBLP:data/11/MilellaPSS25', 'DBLP:data/11/MilellaPSS25a']) {
  const software = bib.entries.find((entry) => entry.key === key);
  assert.ok(software, `${key}: software entry not parsed`);
  assert.equal(software.kind, 'Software', `${key}: incorrect kind`);
  assert.equal(software.venue, 'DROPS Artifacts', `${key}: incorrect venue`);
  assert.notEqual(software.venue, software.fields.note, `${key}: placeholder note used as venue`);
}

// The citation assembled for the collapsed row. The cases that matter are the
// sparse ones: everything below volume, pages and publisher is optional in this
// file, so the assembler is only ever one missing field away from printing a
// separator with nothing on either side of it.
for (const entry of bib.entries) {
  const where = `${entry.key} (@${entry.type}): "${entry.citation}"`;
  assert.ok(entry.citation, `${where}: no citation assembled`);
  assert.ok(!/,\s*,|\.\s*\.|,\s*\.|;\s*[;.]/.test(entry.citation), `${where}: doubled separator`);
  assert.ok(!/^[,.;\s]|[,;]\s*$/.test(entry.citation), `${where}: leading or trailing separator`);
  assert.ok(!/\(\s*\)|\[\s*\]/.test(entry.citation), `${where}: empty parenthesis`);
  assert.ok(!/\s{2,}/.test(entry.citation), `${where}: doubled space`);
  assert.ok(!/[{}\\]/.test(entry.citation), `${where}: unresolved LaTeX`);
  assert.ok(entry.citation.startsWith(entry.venue), `${where}: does not open with the venue`);
  // The record under the citation names the fields it was built from, so every
  // one of them has to be a field this entry really has.
  for (const field of entry.citationFields) {
    assert.ok(entry.fields[field], `${where}: cites a field it does not have (${field})`);
  }
  // A field that is present and belongs in a citation must reach it.
  for (const field of ['volume', 'number', 'pages'] as const) {
    if (entry.fields[field]) {
      assert.ok(entry.citationFields.includes(field), `${where}: dropped ${field}`);
    }
  }
}

// An @article and an @inproceedings read differently: the volume belongs to the
// journal in one and to the series in the other, and neither may print it twice.
const article = bib.entries.find((entry) => entry.key === 'DBLP:journals/cem/StanAND26')!;
assert.equal(article.citation, 'IEEE Consumer Electron. Mag. 15(1), 33–40.');
const paper = bib.entries.find((entry) => entry.key === 'DBLP:conf/time/MilellaPSS25')!;
assert.ok(
  paper.citation.includes(', LIPIcs 355, 19:1–19:7.'),
  `volume misplaced: ${paper.citation}`,
);
assert.ok(paper.citation.endsWith('Informatik.'), `publisher missing: ${paper.citation}`);

// Sparse: no volume, no number, no pages, no publisher — a venue and nothing
// else. It must come out as that venue, not as that venue plus punctuation.
const sparse = bib.entries.find((entry) => entry.key === 'stan_jair2026')!;
assert.equal(sparse.citation, `${sparse.venue}.`);
assert.deepEqual(sparse.citationFields, ['note']);
assert.equal(sparse.link, undefined, 'a link was invented for an entry with no address field');
// No volume but pages present — the comma before the pages is the only one.
const noVolume = bib.entries.find((entry) => entry.key === '11122906')!;
assert.equal(noVolume.citation, 'IEEE Journal of Biomedical and Health Informatics, 1-22.');

// Links. The DOI leads because it outlives the publisher's URL scheme, and an
// entry with none of the four fields shows no link rather than a dead one.
for (const entry of bib.entries) {
  const where = `${entry.key}: ${entry.link?.href}`;
  if (entry.doi) assert.equal(entry.link?.field, 'doi', `${where}: DOI not preferred`);
  if (!entry.link) {
    assert.ok(
      !entry.doi && !entry.fields.url && !entry.fields.html && !entry.fields.pdf,
      `${entry.key}: has an address field but no link`,
    );
    continue;
  }
  assert.ok(
    /^(https?:\/\/|\/assets\/)/.test(entry.link.href),
    `${where}: not a followable address`,
  );
  // `paper\_29.pdf` is a real filename in this file; a backslash left in the
  // href is a 404, so URLs are unescaped without `deLatex`'s prose rules.
  assert.ok(!/[\\{}]/.test(entry.link.href), `${where}: unresolved LaTeX in a link`);
  assert.ok(!/[–—]/.test(entry.link.href), `${where}: a hyphen pair was typeset as a dash`);
}
assert.equal(
  bib.entries.filter((entry) => entry.link).length + 6,
  bib.entries.length,
  'the six manuscripts under review are the only entries with no address field',
);

// Adding an `abstract` to an entry has to be the only action needed for it to
// show, so nothing may gate on a list or a flag.
assert.deepEqual(
  bib.entries.filter((entry) => entry.abstract).map((entry) => entry.key),
  bib.entries.filter((entry) => entry.fields.abstract).map((entry) => entry.key),
  'the abstracts shown are not exactly the entries carrying one',
);

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
