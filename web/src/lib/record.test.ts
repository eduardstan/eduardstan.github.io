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
import { about, activities, bibliography, SOURCES } from './record.ts';
import { announcements, formatStamp } from './announcements.ts';

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
// The loop above states the invariant per entry — an entry either links or has
// none of the four address fields — but is vacuously true if nothing resolves.
assert.ok(
  bib.entries.some((entry) => entry.link),
  'no entry resolved a link at all',
);

// Abstracts follow the entries that carry the field; there is no separate
// allow-list that can drift away from the bibliography.
for (const entry of bib.entries) {
  assert.equal(
    Boolean(entry.abstract),
    Boolean(entry.fields.abstract),
    `${entry.key}: abstract presence disagrees with its fields`,
  );
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

// The generated feed. Every publication and talk is announceable, so the feed
// is at least as long as the bibliography; nothing may reach the page undated,
// unlabelled, or still carrying markdown markers.
const feed = announcements();
assert.ok(feed.items.length >= bib.entries.length, 'the feed is shorter than the bibliography');
for (const item of feed.items) {
  assert.ok(item.text.length > 10, `implausible announcement text: ${item.text}`);
  assert.ok(item.kind, `${item.stamp}: no kind`);
  // A literal `*` is real data — the bibliography contains `OVERLAY@AI*IA 2019`
  // — so what must not survive is an unrendered emphasis pair or a leftover
  // escape from the templates that splice those facts in.
  assert.ok(!item.html.includes('**'), `unrendered bold: ${item.html}`);
  assert.ok(!item.text.includes('**'), `unrendered bold: ${item.text}`);
  assert.ok(!item.text.includes('\\'), `leftover markdown escape: ${item.text}`);
  assert.ok(!Number.isNaN(item.at.valueOf()), `${item.stamp}: unparseable date`);
  // The rendered date may never state more than the source does.
  assert.equal(
    item.precision === 'year',
    /^\d{4}$/.test(formatStamp(item)),
    `${item.stamp}: rendered as "${formatStamp(item)}" at ${item.precision} precision`,
  );
}

// Newest first, and the two same-day service announcements keep the order their
// harvested times give them: IJCAI 2025 at 16:00 above EAAI at 10:00.
for (let i = 1; i < feed.items.length; i++) {
  assert.ok(feed.items[i - 1].at >= feed.items[i].at, 'the feed is not newest-first');
}
// Three things happened on 2025-01-13: two service invitations whose harvested
// times put IJCAI above EAAI, and a blog post, which states only a day and so
// sorts below both.
const sameDay = feed.items.filter((item) => item.stamp.startsWith('2025-01-13'));
assert.equal(sameDay.length, 3, `expected 3 announcements on 2025-01-13, got ${sameDay.length}`);
assert.match(sameDay[0].text, /International Joint Conference/, 'IJCAI 2025 lost its place');
assert.match(sameDay[1].text, /Engineering Applications/, 'EAAI lost its place');

// Facts are escaped on the way into the markdown templates and unescaped on the
// way out, so a venue containing markup characters arrives intact.
const starred = feed.items.find((item) => item.text.includes('AI*IA'));
assert.ok(starred, 'the `OVERLAY@AI*IA` venue did not survive the markdown round trip');
assert.ok(starred.html.includes('AI*IA'), 'the literal asterisk was rendered as emphasis');

// Every talk in cv/pres.bib carries its own ISO date, so all of them announce.
const talks = feed.items.filter((item) => item.kind === 'Talk');
assert.equal(talks.length, 11, `expected 11 talks in the feed, got ${talks.length}`);

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
  `ok — ${bib.entries.length} entries, ${feed.items.length} announcements, ` +
    `${feed.undated.length} undated facts, ${sections.length} activity sections`,
);
