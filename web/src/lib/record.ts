/**
 * The record: everything the Ledger design displays, read from the repository's
 * own data files at build time.
 *
 * Nothing here is transcribed by hand. The site's signature is that any rendered
 * claim can be opened to show the record behind it, so a hand-maintained copy of
 * a count or a source line would be a lie waiting to happen. Every number, every
 * `source:` string and every "this is missing" note below is derived from the
 * files named in `SOURCES`, and changes when they change.
 *
 * The blog is the only content collection left; everything else the site shows
 * is read from the repository's own files here or in `src/lib/cv.ts`. The shapes
 * returned by these readers are the seam consumed by components and provenance
 * blocks.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * Repository root — the directory holding `_config.yml`, found by walking up
 * from the working directory.
 *
 * Not `import.meta.url`: Astro bundles this module into `dist/.prerender/`
 * during `astro build`, so a path relative to the source file resolves
 * somewhere else in a built site than it does under `astro dev`. Walking up for
 * a landmark is the same in both, and does not care whether the build was
 * started from `web/` or from the repository root.
 */
function repositoryRoot(): string {
  let directory = resolve(process.cwd());
  for (;;) {
    if (existsSync(join(directory, '_config.yml'))) return directory;
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(
        'Could not find the repository root (no _config.yml in any parent of ' +
          `${process.cwd()}). The site reads its content from the repository's own data files.`,
      );
    }
    directory = parent;
  }
}

const ROOT = repositoryRoot();

export const SOURCES = {
  bibliography: '_bibliography/papers.bib',
  about: '_pages/about.md',
  talks: 'cv/pres.bib',
  posts: '_posts',
  config: '_config.yml',
  // Read by `src/lib/cv.ts` through Vite's `?raw`, not by `read()` below: it is
  // named here so there is one registry of where the site's facts come from.
  cv: 'cv/cv.yaml',
} as const;

const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** True when a repository-relative path exists on this branch. */
export const hasSource = (path: string) => existsSync(join(ROOT, path));

/** Repository-relative path, so provenance blocks quote the real location. */
const repoPath = (absolute: string) => relative(ROOT, absolute);

/** Read a repository-relative file. Exported for `announcements.ts`. */
export const readSource = read;

/**
 * Every file under a repository-relative directory, one level of subdirectory
 * deep, as repository-relative paths. `_posts/` uses both root files and year
 * directories, so both levels are included.
 */
export function listSources(directory: string, extension = '.md'): string[] {
  const base = join(ROOT, directory);
  if (!existsSync(base)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(base)) {
    const path = join(base, entry);
    if (statSync(path).isDirectory()) {
      for (const file of readdirSync(path))
        if (file.endsWith(extension)) found.push(repoPath(join(path, file)));
    } else if (entry.endsWith(extension)) found.push(repoPath(path));
  }
  return found.sort();
}

// ---------------------------------------------------------------- LaTeX ----

/**
 * The bibliography is DBLP-flavoured BibTeX, so accented letters arrive as
 * `Mu{\~{n}}oz` and dashes as `--`. Only the escapes this bibliography actually
 * uses are handled; an unknown one survives visibly rather than silently
 * dropping a letter.
 */
const ACCENTS: Record<string, Record<string, string>> = {
  "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', c: 'ć', n: 'ń', s: 'ś', z: 'ź', y: 'ý' },
  '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù' },
  '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', y: 'ÿ' },
  '~': { a: 'ã', n: 'ñ', o: 'õ' },
  '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û' },
  c: { c: 'ç', s: 'ş', t: 'ţ' },
  v: { c: 'č', s: 'š', z: 'ž', r: 'ř', e: 'ě' },
  H: { o: 'ő', u: 'ű' },
  '.': { z: 'ż', e: 'ė' },
  '=': { a: 'ā', e: 'ē', i: 'ī', o: 'ō', u: 'ū' },
};

export function deLatex(value: string): string {
  let out = value.replace(/\s*\n\s*/g, ' ');
  // \'{\i} and \'{i} both mean í; the dotless-i form appears in DBLP records.
  out = out.replace(
    /\\(['`"~^cvH.=])\{\\?([a-zA-Z])\}/g,
    (whole, accent: string, letter: string) => {
      const mapped = ACCENTS[accent]?.[letter.toLowerCase()];
      if (!mapped) return whole;
      return letter === letter.toUpperCase() ? mapped.toUpperCase() : mapped;
    },
  );
  out = out
    .replace(/\\ss\b/g, 'ß')
    .replace(/\{\\l\}/g, 'ł')
    .replace(/\{\\L\}/g, 'Ł');
  out = out.replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\_/g, '_');
  out = out.replace(/---/g, '—').replace(/(?<!-)--(?!-)/g, '–');
  out = out.replace(/[{}]/g, '');
  return out.replace(/\s{2,}/g, ' ').trim();
}

/**
 * The same unescaping for an address rather than for prose.
 *
 * `deLatex` cannot be used on a URL or a DOI: it rewrites `--` as an en dash,
 * and two hyphens in a path are two hyphens. Only the escapes that appear in
 * the addresses this bibliography actually holds are undone — `paper\_29.pdf`
 * is a real filename in it, and a backslash left in that link breaks it.
 */
const deLatexUrl = (value: string) => value.replace(/\\([_&%#$~])/g, '$1').replace(/[{}]/g, '');

// ------------------------------------------------------------ BibTeX ------

/** Somewhere to follow an entry to, and the field that said so. */
export interface Link {
  href: string;
  /** The BibTeX field it came from — the record under the link. */
  field: string;
  /** `DOI` / `Paper` / `PDF`, the shortest true name for what is on the end. */
  label: string;
}

export interface Publication {
  key: string;
  type: string;
  /** "Journal" / "Conference" / "Thesis" — the label shown in the Type column. */
  kind: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  /** The BibTeX field `venue` was read from, so the row can say which. */
  venueField?: string;
  /** Venue, series, volume, number, pages, publisher — whichever this entry has. */
  citation: string;
  /** The fields `citation` was assembled from, in the order they appear in it. */
  citationFields: string[];
  /** Volume / pages / publisher, already assembled into one record line. */
  detail: string;
  doi?: string;
  link?: Link;
  abstract?: string;
  /**
   * The entry exactly as it appears in the .bib file, braces and all. This is
   * what the copy button puts on the clipboard: a citation someone can paste
   * straight into their own bibliography, and the least edited form of the
   * record the site holds.
   */
  raw: string;
  fields: Record<string, string>;
}

const KINDS: Record<string, string> = {
  article: 'Journal',
  inproceedings: 'Conference',
  incollection: 'Chapter',
  phdthesis: 'Thesis',
  mastersthesis: 'Thesis',
  book: 'Book',
  techreport: 'Report',
  online: 'Preprint',
  // The `@misc` entries in this bibliography are released software packages
  // filed under DROPS Artifacts. DBLP keys them `data/…`.
  misc: 'Software',
};

/**
 * What to call an entry, following the CV rather than inventing a taxonomy.
 *
 * `cv/cv.tex` sorts the same bibliography with biblatex filters — `type=article`
 * is "Journal articles", `type=inproceedings and keyword=workshop` is "Workshop
 * papers", `type=online and keyword=underreview` is "Under review" — so the
 * entry type plus the keywords the CV already relies on decide the label here
 * too. Nothing is filtered out: the CV's Publications section omits some entry
 * types, but the bibliography is the record and every entry in it is shown.
 */
function kindOf(type: string, fields: Record<string, string>): string {
  const keywords = (fields.keywords ?? '').toLowerCase();
  if (type === 'online' && keywords.includes('underreview')) return 'Under review';
  if (type === 'inproceedings' && keywords.includes('workshop')) return 'Workshop';
  return KINDS[type] ?? 'Other';
}

/** Surname particles that must not be abbreviated away ("D. Della Monica"). */
const PARTICLES = new Set(['della', 'delle', 'del', 'de', 'di', 'da', 'dos', 'van', 'von', 'la']);

/**
 * `Ionel Eduard Stan` → `I. E. Stan`, `{I.E.} Stan` → `I. E. Stan`,
 * `Dario Della Monica` → `D. Della Monica`.
 *
 * BibTeX has two name forms and this bibliography uses both: `First von Last`,
 * and `von Last, First` where the comma marks the end of the surname. Reading
 * the second as the first turns `Stan, Ionel Eduard` into `S. I. Eduard`, so
 * the comma is checked before anything else.
 *
 * A particle starts the surname and everything after it belongs to the surname:
 * `Della` is not a given name, and initialising it would rename the author.
 */
function formatAuthor(raw: string): string {
  const name = deLatex(raw);
  const comma = name.indexOf(',');
  let given: string[];
  let surname: string | undefined;
  if (comma === -1) {
    const words = name.split(/\s+/).filter(Boolean);
    const particle = words.findIndex((word) => PARTICLES.has(word.toLowerCase()));
    const split = particle === -1 ? words.length - 1 : particle;
    given = words.slice(0, split);
    surname = words.slice(split).join(' ');
  } else {
    given = name
      .slice(comma + 1)
      .split(/\s+/)
      .filter(Boolean);
    surname = name.slice(0, comma).trim();
  }
  if (!surname || given.length === 0) return name.replace(/,\s*$/, '');
  const initials = given.flatMap((word) =>
    // "I.E." is one word carrying two initials.
    word.includes('.')
      ? word
          .split('.')
          .filter(Boolean)
          .map((part) => `${part}.`)
      : [`${word[0]}.`],
  );
  return [...initials, surname].join(' ');
}

/** Reads `field = {value}` / `field = "value"` with brace-depth awareness. */
function parseFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let index = 0;
  while (index < body.length) {
    const match = /\s*([a-zA-Z]+)\s*=\s*/y;
    match.lastIndex = index;
    const found = match.exec(body);
    if (!found) {
      const next = body.indexOf(',', index);
      if (next === -1) break;
      index = next + 1;
      continue;
    }
    let cursor = match.lastIndex;
    let value = '';
    if (body[cursor] === '{' || body[cursor] === '"') {
      const open = body[cursor];
      const close = open === '{' ? '}' : '"';
      let depth = 0;
      const start = cursor;
      for (; cursor < body.length; cursor++) {
        // Braces nest, so an opener is checked first; `"` is its own closer, so
        // once one is open the next one ends the value rather than nesting.
        if (body[cursor] === close && depth > 0) {
          depth--;
          if (depth === 0) {
            cursor++;
            break;
          }
        } else if (body[cursor] === open) depth++;
      }
      value = body.slice(start + 1, cursor - 1);
    } else {
      const end = body.indexOf(',', cursor);
      value = body.slice(cursor, end === -1 ? body.length : end);
      cursor = end === -1 ? body.length : end;
    }
    fields[found[1].toLowerCase()] = value.trim();
    const comma = body.indexOf(',', cursor);
    index = comma === -1 ? body.length : comma + 1;
  }
  return fields;
}

/**
 * Where the work appeared, and which field said so.
 *
 * Manuscripts under review carry it in `note` ("Journal of Artificial
 * Intelligence Research (Manuscript under review)") and released artifacts in
 * `publisher`, so both are fallbacks rather than special cases — an entry with
 * neither simply has no venue line. `publisher` is tried before `note` because
 * the `@misc` artifacts have both, and their note is DBLP's unfilled
 * "Accessed on YYYY-MM-DD." template rather than a venue.
 */
const VENUE_FIELDS = ['journal', 'booktitle', 'school', 'publisher', 'note'] as const;

/**
 * The venue line as a citation: venue, series, volume, number, pages,
 * publisher — and only the ones this entry actually has.
 *
 * Not a citation style. There is no CSL here and no per-type template: the
 * volume attaches to the series where there is one and to the venue where
 * there is not, which is the whole of the difference between how a journal
 * article and a conference paper read, and the rest is `join(', ')` over the
 * fields that exist. Every part is dropped before the join rather than after
 * it, so a separator is never printed with nothing on one side of it, and an
 * entry down to a venue alone yields that venue and nothing else.
 */
function citationOf(
  fields: Record<string, string>,
  venue: string,
  venueField: string | undefined,
): { citation: string; citationFields: string[] } {
  const used: string[] = [];
  const take = (name: string) => {
    const value = fields[name] && deLatex(fields[name]);
    if (value) used.push(name);
    return value || '';
  };
  const series = take('series');
  // `number` qualifies a volume — 12(3). On its own it is the only number the
  // entry has, so it takes the volume's place rather than printing "(3)".
  const volume = take('volume');
  const number = take('number');
  const numbered = volume ? (number ? `${volume}(${number})` : volume) : number;
  const pages = take('pages');
  const publisher = take('publisher');

  if (venueField) used.unshift(venueField);
  // Where the volume goes: onto the series if the entry has one, onto the
  // venue if it does not. A journal reads "Fuzzy Sets and Systems 456", a
  // conference "…, LIPIcs 355".
  const head = [venue, series ? '' : numbered].filter(Boolean).join(' ');
  const line = [head, series && [series, numbered].filter(Boolean).join(' '), pages]
    .filter(Boolean)
    .join(', ');
  // The publisher is already the venue for entries that have nothing else.
  const parts = [line, publisher === venue ? '' : publisher].filter(Boolean).join('. ');
  if (publisher && publisher === venue) used.splice(used.indexOf('publisher'), 1);
  return {
    citation: !parts ? '' : /[.!?]$/.test(parts) ? parts : `${parts}.`,
    citationFields: used,
  };
}

/**
 * Where to follow the entry to, most durable identifier first.
 *
 * The DOI leads: it keeps resolving after a publisher reorganises its site,
 * and for most entries here DBLP's `url` is that same doi.org address anyway.
 * Then `html`, a landing page chosen by hand; then `url`; then `pdf`, which is
 * a file rather than a record and so is the last resort. `html` and `pdf` are
 * al-folio's fields and follow al-folio's own rule for them — an absolute
 * address is used as it stands, anything else names a file under the site's
 * assets (`_layouts/bib.liquid`).
 */
function linkOf(fields: Record<string, string>, doi: string | undefined): Link | undefined {
  const asset = (name: string, directory: string) => {
    const value = deLatexUrl(fields[name]);
    return value.includes('://') ? value : `/assets/${directory}/${value}`;
  };
  if (doi) return { href: `https://doi.org/${doi}`, field: 'doi', label: 'DOI' };
  if (fields.html) return { href: asset('html', 'html'), field: 'html', label: 'Paper' };
  if (fields.url) return { href: deLatexUrl(fields.url), field: 'url', label: 'Paper' };
  if (fields.pdf) return { href: asset('pdf', 'pdf'), field: 'pdf', label: 'PDF' };
  return undefined;
}

function toPublication(
  type: string,
  key: string,
  fields: Record<string, string>,
  raw: string,
): Publication {
  const venueField = VENUE_FIELDS.find((name) => fields[name]);
  const venue = venueField ? deLatex(fields[venueField]) : '';
  const publisher = fields.publisher && deLatex(fields.publisher);
  const detail = [
    fields.series && deLatex(fields.series),
    fields.volume && `volume ${deLatex(fields.volume)}`,
    fields.number && `number ${deLatex(fields.number)}`,
    fields.pages && `pages ${deLatex(fields.pages)}`,
    // Already the venue for entries that have nothing else; do not print twice.
    publisher !== venue && publisher,
  ]
    .filter(Boolean)
    .join(', ');
  const doi = fields.doi ? deLatexUrl(fields.doi) : undefined;
  const link = linkOf(fields, doi);
  return {
    key,
    type,
    kind: kindOf(type, fields),
    title: deLatex(fields.title ?? ''),
    authors: (fields.author ?? '')
      .split(/\s+and\s+/)
      .filter(Boolean)
      .map(formatAuthor),
    year: Number.parseInt(fields.year ?? '0', 10),
    venue,
    venueField,
    ...citationOf(fields, venue, venueField),
    detail,
    doi,
    link,
    abstract: fields.abstract ? deLatex(fields.abstract) : undefined,
    raw,
    fields,
  };
}

export interface Bibliography {
  source: string;
  entries: Publication[];
  /** Counts by rendered kind ("Journal", "Conference", …), largest first. */
  byKind: { kind: string; count: number }[];
  years: { first: number; last: number };
}

export interface BibEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
  raw: string;
}

/**
 * Split a BibTeX file into entries. Used for `_bibliography/papers.bib` here and
 * for `cv/pres.bib` by `announcements.ts`, so the two files are read by one
 * parser rather than by two that can drift apart.
 */
export function parseBib(raw: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const entryPattern = /^@([a-zA-Z]+)\s*\{\s*([^,]+),/gm;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    // The entry ends at the closing brace balancing the one after the entry type.
    let depth = 0;
    let cursor = match.index;
    for (; cursor < raw.length; cursor++) {
      if (raw[cursor] === '{') depth++;
      else if (raw[cursor] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    entries.push({
      type: match[1].toLowerCase(),
      key: match[2].trim(),
      fields: parseFields(raw.slice(start, cursor)),
      raw: raw.slice(match.index, cursor + 1),
    });
  }
  return entries;
}

let bibliographyCache: Bibliography | undefined;

export function bibliography(): Bibliography {
  if (bibliographyCache) return bibliographyCache;
  const entries = parseBib(read(SOURCES.bibliography)).map((entry) =>
    toPublication(entry.type, entry.key, entry.fields, entry.raw),
  );
  entries.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  const years = entries.map((entry) => entry.year).filter((year) => year > 0);

  bibliographyCache = {
    source: SOURCES.bibliography,
    entries,
    byKind: [...counts].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count),
    years: { first: Math.min(...years), last: Math.max(...years) },
  };
  return bibliographyCache;
}

// ---------------------------------------------------------------- talks ----

export interface Talk {
  key: string;
  title: string;
  /** `invited` / `oral` / `poster` — the entry's own `keywords` field. */
  category: string;
  /** The entry's own `note`: "Invited talk", "Oral presentation", … */
  note: string;
  event: string;
  where: string;
  /** ISO 8601, as the entry's `date` field states it. */
  date: string;
  year: number;
}

export interface Talks {
  source: string;
  entries: Talk[];
  /** Counts by category, largest first — the same shape as `byKind`. */
  byCategory: { category: string; count: number }[];
  years: { first: number; last: number };
  /** Entries whose `date` is not ISO 8601, named rather than given a guess. */
  undated: string[];
}

let talksCache: Talks | undefined;

/**
 * `cv/pres.bib`, the talks the CV renders with biblatex, read with the same
 * parser as the bibliography.
 *
 * Nothing is filtered and nothing is relabelled: `note` is the talk's own word
 * for what it was and `keywords` its own category, exactly as `announcements.ts`
 * already treats them. The file is LaTeX like `papers.bib` is (`Krak{\'{o}}w`,
 * `{HS3}`), so every field goes through `deLatex`.
 */
export function talks(): Talks {
  if (talksCache) return talksCache;
  const entries = parseBib(read(SOURCES.talks)).map((entry): Talk => {
    const field = (name: string) => deLatex(entry.fields[name] ?? '');
    const date = (entry.fields.date ?? '').trim();
    return {
      key: entry.key,
      title: field('title'),
      category: field('keywords'),
      note: field('note'),
      event: field('eventtitle'),
      where: field('venue'),
      date,
      year: Number.parseInt(date.slice(0, 4), 10),
    };
  });
  // ISO 8601 sorts lexicographically, so the string is the sort key. An entry
  // with no date has nothing to sort on and goes last rather than to 1970.
  entries.sort(
    (a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title),
  );

  const counts = new Map<string, number>();
  for (const talk of entries) counts.set(talk.category, (counts.get(talk.category) ?? 0) + 1);
  const years = entries.map((talk) => talk.year).filter((year) => year > 0);

  talksCache = {
    source: SOURCES.talks,
    entries,
    byCategory: [...counts]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    years: { first: Math.min(...years), last: Math.max(...years) },
    undated: entries
      .filter((talk) => !/^\d{4}-\d{2}-\d{2}/.test(talk.date))
      .map((talk) => talk.key),
  };
  return talksCache;
}

// ---------------------------------------------------------------- prose ----

/** `--` / `---` are the source files' own spelling of en and em dashes. */
const dashes = (value: string) => value.replace(/---/g, '—').replace(/(?<!-)--(?!-)/g, '–');

/**
 * A markdown backslash escape is the file's way of writing a punctuation mark
 * literally (`A\*` is the CORE rank A*), so the backslash belongs to the markup
 * and not to the text. Applied last, after the emphasis and link patterns have
 * run, so an escaped marker is never mistaken for a live one.
 */
const unescape = (value: string) => value.replace(/\\([\\`*_{}[\]()#+\-.!"'~<>|])/g, '$1');

/** Markdown emphasis and links, inline only — these bodies are a single line. */
export function inlineHtml(markdown: string): string {
  const escaped = dashes(markdown)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // The link pattern below drops the URL into a quoted attribute, so a quote
    // anywhere in the body has to stop being one first.
    .replace(/"/g, '&quot;')
    .trim();
  return unescape(
    escaped
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/__([^_]+)__/g, '<b>$1</b>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>')
      // Prettier rewrites `*em*` as `_em_`, and it runs over these source files.
      // Underscores only open emphasis at a word boundary, so identifiers and
      // paths (`neuro_symb_dt2024`, `_pages/about.md`) are left alone.
      .replace(/(?<![\w_])_([^_]+)_(?![\w_])/g, '<i>$1</i>'),
  );
}

export function stripMarkdown(markdown: string): string {
  return unescape(
    dashes(markdown)
      .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
      .replace(/\*\*?([^*]+)\*\*?/g, '$1')
      .replace(/(?<![\w_])__?([^_]+)__?(?![\w_])/g, '$1'),
  ).trim();
}

// --------------------------------------------------------------- about -----

export interface About {
  source: string;
  /** Paragraphs of the `## about` section, as inline HTML. */
  paragraphs: string[];
  lineRange: string;
  /**
   * One sentence in his own voice for above the fold. Taken from the opening
   * sentence with the title clause removed, because the dateline two lines up
   * already states the title. Nothing is added: if the sentence is ever
   * rewritten without a `, where …` clause, the whole sentence is used.
   */
  firstPerson: string;
  firstPersonSource: string;
}

export function about(): About {
  const raw = read(SOURCES.about);
  const lines = raw.split('\n');
  const start = lines.findIndex((line) => /^##\s+about\s*$/i.test(line));
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index++) {
    if (/^##\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }
  const paragraphs = lines
    .slice(start + 1, end)
    .join('\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(
      (paragraph) => paragraph && !paragraph.startsWith('<!--') && !paragraph.startsWith('{%'),
    )
    .map(inlineHtml);
  const opening = stripMarkdown(
    lines
      .slice(start + 1, end)
      .join('\n')
      .trim()
      .split(/\n{2,}/)[0]
      .split('. ')[0] + '.',
  );
  const clause = /,\s+where\s+(.+)$/.exec(opening);
  const firstPerson = clause ? `${clause[1][0].toUpperCase()}${clause[1].slice(1)}` : opening;

  return {
    source: SOURCES.about,
    paragraphs,
    lineRange: `lines ${start + 2}–${end}`,
    firstPerson,
    firstPersonSource: `${SOURCES.about} line ${start + 3}, first sentence`,
  };
}

// --------------------------------------------------------------- who -------

export interface Profile {
  source: string;
  name: string;
  email?: string;
  /** Only the accounts `_config.yml` actually names; blank fields are dropped. */
  links: { label: string; href: string }[];
  /** Account fields present but empty in the config, so the omission is visible. */
  missing: string[];
  /** The postal address as written in the about page's front matter. */
  address: string[];
  /** Role, lab, department, university — the about page's `subtitle`. */
  affiliation: string[];
  addressSource: string;
}

/** Front-matter block scalar (`key: >` followed by an indented run of lines). */
function blockScalar(raw: string, key: string): string[] {
  const match = new RegExp(`^\\s*${key}:\\s*>\\n([\\s\\S]*?)\\n\\s*(?:\\n|[a-z_]+:)`, 'm').exec(
    raw,
  );
  return (match?.[1] ?? '')
    .split('\n')
    .map((line) => line.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}

/** Top-level `key: value` pairs, which is all this reader needs from the YAML. */
function configValue(raw: string, key: string): string | undefined {
  const match = new RegExp(`^${key}:\\s*(.*?)\\s*(?:#.*)?$`, 'm').exec(raw);
  const value = match?.[1]?.replace(/^["']|["']$/g, '').trim();
  return value || undefined;
}

export function profile(): Profile {
  const raw = read(SOURCES.config);
  const name = [
    configValue(raw, 'first_name'),
    configValue(raw, 'middle_name'),
    configValue(raw, 'last_name'),
  ]
    .filter(Boolean)
    .join(' ');

  const accounts: [string, string, (id: string) => string][] = [
    ['scholar_userid', 'Google Scholar', (id) => `https://scholar.google.com/citations?user=${id}`],
    ['orcid_id', 'ORCID', (id) => `https://orcid.org/${id}`],
    ['github_username', 'GitHub', (id) => `https://github.com/${id}`],
    ['linkedin_username', 'LinkedIn', (id) => `https://www.linkedin.com/in/${id}`],
  ];
  const links = accounts.flatMap(([key, label, href]) => {
    const id = configValue(raw, key);
    return id ? [{ label: `${label} · ${id}`, href: href(id) }] : [];
  });
  const missing = accounts.filter(([key]) => !configValue(raw, key)).map(([key]) => key);

  // The address and the affiliation lines live in the about page's front matter.
  const aboutRaw = read(SOURCES.about);

  return {
    source: SOURCES.config,
    name,
    email: configValue(raw, 'email'),
    links,
    missing,
    address: blockScalar(aboutRaw, 'more_info'),
    affiliation: blockScalar(aboutRaw, 'subtitle'),
    addressSource: `${SOURCES.about} (front matter)`,
  };
}
