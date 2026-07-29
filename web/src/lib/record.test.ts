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
import {
  about,
  bibliography,
  listSources,
  profile,
  readSource,
  stripMarkdown,
  talks,
  SOURCES,
} from './record.ts';
import { announcements, formatStamp, say, shortVenue } from './announcements.ts';

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
const article = bib.entries.find((entry) => entry.doi === '10.1109/MCE.2025.3546049')!;
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
// wrong. `Lovelace, Ada Maria` read as `First Last` yields `L. A. Maria`.
const authors = bib.entries.flatMap((entry) => entry.authors);
const owner = profile();
assert.ok(authors.includes('E. Muñoz-Velasco'), 'LaTeX accent not resolved in author names');
assert.ok(authors.includes('D. Della Monica'), 'surname particle was initialised away');
assert.ok(authors.includes(owner.bibliographyName), 'profile name not normalised like an author');
assert.ok(
  !authors.some((author) => author.endsWith(owner.name.split(/\s+/)[0])),
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

// The announcement templates, and the sparse cases they have to survive. Every
// field but the title is optional in the CV, so a template is only ever one
// missing slot away from a dangling comma or an empty parenthesis.
assert.equal(say('Appointment', { what: 'Reader', where: 'Example' }), '**Reader**, Example.');
assert.equal(say('Appointment', { what: 'Reader' }), '**Reader**.');
assert.equal(
  say('Editorial', { what: 'Associate Editor', where: 'Frontiers', detail: 'Pattern Recognition' }),
  '**Associate Editor**, Frontiers, Pattern Recognition.',
);
assert.equal(
  say('Editorial', { what: 'Associate Editor', where: 'Frontiers' }),
  '**Associate Editor**, Frontiers.',
);
assert.equal(
  say('Service', { what: 'Program Committee', where: 'IJCAI', year: '2026' }),
  '**Program Committee**, IJCAI 2026.',
);
assert.equal(
  say('Service', { what: 'Program Committee', where: 'IJCAI' }),
  '**Program Committee**, IJCAI.',
);
assert.equal(
  say('Service', { what: 'Program Committee', year: '2026' }),
  '**Program Committee**, 2026.',
);
assert.equal(say('Service', { what: 'Program Committee' }), '**Program Committee**.');
assert.equal(
  say('Award', { what: 'Best Graduate', detail: 'University of Udine' }),
  '**Best Graduate**, University of Udine.',
);
assert.equal(say('Talk', { what: 'Modal Symbolic Learning' }), '_Modal Symbolic Learning_.');
assert.equal(
  say('Under review', { what: 'A paper', where: 'JAIR' }),
  '**A paper**, submitted to JAIR.',
);
assert.equal(say('Under review', { what: 'A paper' }), '**A paper**.');
assert.equal(say('Writing', { what: 'A post' }), '**A post**.');
// An unknown kind — a section an adopter invents — falls back, it does not throw.
assert.equal(
  say('Fieldwork', { what: 'Ross Sea', where: 'RV Tangaroa' }),
  '**Ross Sea**, RV Tangaroa.',
);
// Abbreviated venues already end in a full stop; never two.
assert.equal(
  say('Journal', { what: 'A paper', where: 'Inf. Comput.' }),
  '**A paper**, Inf. Comput.',
);

// The short venue is the acronym the CV puts in brackets — and a bracket holding
// several words is a lab or a group, not an acronym.
assert.equal(
  shortVenue('International Joint Conference on Artificial Intelligence (IJCAI)'),
  'IJCAI',
);
assert.equal(shortVenue('Elsevier Neurocomputing Journal'), 'Elsevier Neurocomputing Journal');
assert.equal(
  shortVenue('University of Milano-Bicocca (Intelligent Sensing Laboratory—ISLab)'),
  'University of Milano-Bicocca (Intelligent Sensing Laboratory—ISLab)',
);

// No announcement may reach the page with a separator on one side of nothing.
for (const item of feed.items) {
  assert.ok(!/,\s*,|,\s*\.|\(\s*\)|\s{2,}/.test(item.text), `stray separator: ${item.text}`);
  assert.ok(!/^[,.\s]/.test(item.text), `leading separator: ${item.text}`);
  assert.match(item.text, /\.$/, `no full stop: ${item.text}`);
}

// A manuscript under review does not announce on the year it is aimed at, and
// says so in the provenance rather than vanishing.
const underReview = bib.entries.filter((entry) => entry.kind === 'Under review');
assert.ok(underReview.length > 0, 'no under-review entries to check the rule against');
for (const entry of underReview) {
  if (entry.fields.announced) continue;
  assert.ok(
    !feed.items.some((item) => item.text.startsWith(entry.title)),
    `${entry.key}: an undated manuscript under review reached the feed`,
  );
  assert.ok(
    feed.undated.some((fact) => fact.what === entry.title),
    `${entry.key}: not in the feed and not named in the undated list either`,
  );
}

const linkedPublication = bib.entries.find((entry) => entry.link?.field === 'doi')!;
const linkedAnnouncement = feed.items.find(
  (item) => item.source === `${SOURCES.bibliography} (${linkedPublication.key})`,
)!;
assert.ok(
  linkedAnnouncement.html.includes(`href="${linkedPublication.link!.href}"`),
  `${linkedPublication.key}: resolved publication link did not reach its announcement`,
);

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
assert.match(sameDay[0].text, /IJCAI 2025/, 'IJCAI 2025 lost its place');
assert.match(sameDay[1].text, /Engineering Applications/, 'EAAI lost its place');

// Sorting follows the instant, but display follows the calendar date written in
// the source stamp even when its offset puts that instant on the previous UTC day.
const offsetStamp = '2025-01-01T00:30:00+02:00';
const offsetAnnouncement = {
  ...sameDay[0],
  stamp: offsetStamp,
  at: new Date(offsetStamp),
  precision: 'minute' as const,
};
assert.equal(offsetAnnouncement.at.toISOString().slice(0, 10), '2024-12-31');
assert.equal(formatStamp(offsetAnnouncement), '1 Jan 2025');

// Facts are escaped on the way into the markdown templates and unescaped on the
// way out, so a venue containing markup characters arrives intact.
const starred = feed.items.find((item) => item.text.includes('AI*IA'));
assert.ok(starred, 'the `OVERLAY@AI*IA` venue did not survive the markdown round trip');
assert.ok(starred.html.includes('AI*IA'), 'the literal asterisk was rendered as emphasis');

// Every talk in content/talks.bib carries its own ISO date, so all of them
// announce. Each one's kind on the feed's apparatus line is its own `note`
// ("Invited talk", "Oral presentation", "Poster presentation") — the word moved
// off the sentence and onto that line, and nothing is relabelled.
const TALK_KINDS = ['Invited talk', 'Oral presentation', 'Poster presentation'];
const talkItems = feed.items.filter((item) => TALK_KINDS.includes(item.kind));
assert.equal(talkItems.length, 11, `expected 11 talks in the feed, got ${talkItems.length}`);

// ------------------------------------------------------------------ talks ---
// /talks/ renders every entry in content/talks.bib, so the same rule as the
// bibliography applies: nothing filtered, nothing relabelled, nothing left
// carrying LaTeX.
const pres = talks();
const presGrepped = readFileSync(root + SOURCES.talks, 'utf8').match(/^@/gm)!.length;
assert.equal(pres.entries.length, presGrepped, 'talk count disagrees with `grep -c "^@"`');
assert.equal(pres.entries.length, 11, `expected 11 talks, got ${pres.entries.length}`);
assert.deepEqual(pres.undated, [], 'a talk reached the page without an ISO 8601 date');

for (const talk of pres.entries) {
  assert.ok(talk.title, `${talk.key}: no title`);
  assert.ok(talk.event, `${talk.key}: no eventtitle`);
  assert.ok(
    talk.note,
    `${talk.key}: no note — the page prints the entry's own word for what it was`,
  );
  // The badge on every row. An entry with no `keywords` would render an empty one.
  assert.ok(
    ['invited', 'oral', 'poster'].includes(talk.category),
    `${talk.key}: unexpected category "${talk.category}"`,
  );
  assert.match(
    talk.date,
    /^\d{4}-\d{2}-\d{2}$/,
    `${talk.key}: date "${talk.date}" is not an ISO day`,
  );
  assert.ok(talk.year > 1990, `${talk.key}: implausible year ${talk.year}`);
  for (const [field, value] of Object.entries({
    title: talk.title,
    event: talk.event,
    where: talk.where,
    note: talk.note,
  })) {
    assert.ok(!/[{}\\]/.test(value), `${talk.key}: unresolved LaTeX in ${field} — ${value}`);
  }
}

// The two entries a naive read gets wrong: an accent, and a braced acronym.
assert.ok(
  pres.entries.some((talk) => talk.where === 'Kraków, Poland'),
  'the accented venue was not de-LaTeXed',
);
assert.ok(
  pres.entries.some((talk) => talk.title.includes('for HS3')),
  'the braced acronym {HS3} kept its braces',
);

// Newest first, and the category counts account for every entry.
for (let i = 1; i < pres.entries.length; i++) {
  assert.ok(pres.entries[i - 1].date >= pres.entries[i].date, 'talks are not newest-first');
}
assert.equal(
  pres.byCategory.reduce((total, category) => total + category.count, 0),
  pres.entries.length,
  'the category counts do not add up to the number of talks',
);
assert.equal(pres.years.first, 2017, `earliest talk year is ${pres.years.first}`);

// About, now `profile.bio.long` in the CV. Prettier runs over the source and
// spells emphasis `_like this_`, so both markers have to render — and neither
// may fire on an underscore inside a word.
const bio = about();
assert.ok(bio.paragraphs.length >= 3, 'profile.bio.long did not parse into paragraphs');
assert.ok(
  !bio.paragraphs.some((paragraph) => /[*_]{1,2}\w/.test(paragraph)),
  'unrendered markdown emphasis left in the about paragraphs',
);
assert.ok(
  bio.paragraphs.some((paragraph) => paragraph.includes('<i>')),
  'no emphasis rendered from the about page',
);
assert.ok(!/[*_]/.test(bio.firstPerson), 'markdown markers left in the first-person line');
// The quote is the opening sentence verbatim. One full stop, not two — a
// one-sentence `bio.long` already ends with the one it has.
assert.ok(!/\.\.$/.test(bio.firstPerson), `doubled full stop: ${bio.firstPerson}`);
assert.match(bio.firstPerson, /[.!?]$/, `the quote does not end a sentence: ${bio.firstPerson}`);
// It is the opening of the first paragraph, not a sentence from elsewhere.
// `paragraphs[0]` is inline HTML, so the comparison is on the plain prefix.
assert.ok(
  stripMarkdown(bio.paragraphs[0].replace(/<[^>]+>/g, '')).startsWith(bio.firstPerson.slice(0, 12)),
  `the quote is not the opening of the first paragraph: ${bio.firstPerson}`,
);
// Every source the site reads lives in `content/`. That is the whole adopter
// interface: a reader pointed anywhere else is a fact the adopter cannot change
// by editing this directory, and the cold-start test stops being true.
for (const [key, path] of Object.entries(SOURCES)) {
  assert.ok(path.startsWith('content/'), `SOURCES.${key} reads outside content/: ${path}`);
}
const reader = readFileSync(fileURLToPath(new URL('./record.ts', import.meta.url)), 'utf8');
assert.doesNotMatch(
  reader,
  /_pages\/|_config\.yml|_bibliography\//,
  'record.ts reads one of the pre-migration files again',
);
// The header brand is derived too: an adopter must not find someone else's
// institution in the bar on every page.
const header = readFileSync(
  fileURLToPath(new URL('../components/Header.astro', import.meta.url)),
  'utf8',
);
assert.doesNotMatch(
  header,
  /Milano-Bicocca/,
  'the header brand names an institution instead of deriving it from profile.affiliation',
);
const surname = owner.bibliographyName.split(/\s+/).at(-1);
assert.ok(surname, 'profile name has no surname');
for (const path of listSources('web/src', ['.astro', '.ts', '.tsx', '.js', '.mjs'])) {
  assert.ok(!readSource(path).includes(surname), `${path} hard-codes the profile surname`);
}
// `journaltitle` is BibLaTeX's name for `journal` and is what Zotero's Better
// BibTeX writes. Without it an adopter's most recent article renders with no
// venue and no error anywhere.
assert.match(reader, /'journaltitle'/, 'VENUE_FIELDS lost journaltitle');

console.log(
  `ok — ${bib.entries.length} entries, ${pres.entries.length} talks, ` +
    `${feed.items.length} announcements, ${feed.undated.length} undated facts`,
);
