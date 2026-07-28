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
 * Content migration into Astro collections is a separate task. Until it happens,
 * these readers are the seam: the shapes returned here are what the components
 * consume, so the reader can be swapped for `getCollection()` without the
 * components or the provenance blocks changing.
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
  activities: '_pages/professional_activities.md',
  news: '_news',
  config: '_config.yml',
} as const;

const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** True when a repository-relative path exists on this branch. */
export const hasSource = (path: string) => existsSync(join(ROOT, path));

/** Repository-relative path, so provenance blocks quote the real location. */
const repoPath = (absolute: string) => relative(ROOT, absolute);

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

function deLatex(value: string): string {
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

// ------------------------------------------------------------ BibTeX ------

export interface Publication {
  key: string;
  type: string;
  /** "Journal" / "Conference" / "Thesis" — the label shown in the Type column. */
  kind: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  /** Volume / pages / publisher, already assembled into one record line. */
  detail: string;
  doi?: string;
  url?: string;
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
  if (keywords.includes('underreview')) return 'Under review';
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
        if (body[cursor] === open) depth++;
        else if (body[cursor] === close) {
          depth--;
          if (depth === 0) {
            cursor++;
            break;
          }
        }
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

function toPublication(
  type: string,
  key: string,
  fields: Record<string, string>,
  raw: string,
): Publication {
  // Where the work appeared. Manuscripts under review carry it in `note`
  // ("Journal of Artificial Intelligence Research (Manuscript under review)")
  // and released artifacts in `publisher`, so both are fallbacks rather than
  // special cases — an entry with neither simply has no venue line.
  const venue = deLatex(
    fields.journal ?? fields.booktitle ?? fields.school ?? fields.note ?? fields.publisher ?? '',
  );
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
  const doi = fields.doi ? deLatex(fields.doi) : undefined;
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
    detail,
    doi,
    url: fields.html ?? fields.url ?? (doi ? `https://doi.org/${doi}` : undefined),
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

let bibliographyCache: Bibliography | undefined;

export function bibliography(): Bibliography {
  if (bibliographyCache) return bibliographyCache;
  const raw = read(SOURCES.bibliography);
  const entries: Publication[] = [];
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
    const fields = parseFields(raw.slice(start, cursor));
    const source = raw.slice(match.index, cursor + 1);
    entries.push(toPublication(match[1].toLowerCase(), match[2].trim(), fields, source));
  }
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

// --------------------------------------------------------------- news ------

export interface NewsItem {
  source: string;
  date: Date;
  /** Body as inline HTML: the markdown emphasis and links the file actually has. */
  html: string;
  text: string;
  /** Derived from the filename slug, so the feed can be scanned by kind. */
  kind: string;
}

export interface NewsDefect {
  source: string;
  problem: string;
  /** True when the defect made the item unpublishable, not merely inconsistent. */
  excluded: boolean;
}

const KIND_RULES: [RegExp, string][] = [
  [/paper|accepted|online/, 'Paper'],
  [/editor/, 'Editorial'],
  [/position|hired/, 'Appointment'],
  [/post|manifesto/, 'Writing'],
  [/pc-|ac-|reviewer|committee|technical/, 'Service'],
];

/** `--` / `---` are the source files' own spelling of en and em dashes. */
const dashes = (value: string) => value.replace(/---/g, '—').replace(/(?<!-)--(?!-)/g, '–');

/** Markdown emphasis and links, inline only — news bodies are a single line. */
function inlineHtml(markdown: string): string {
  const escaped = dashes(markdown)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
  return (
    escaped
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/__([^_]+)__/g, '<b>$1</b>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>')
      // Prettier rewrites `*em*` as `_em_`, and it runs over these source files.
      // Underscores only open emphasis at a word boundary, so identifiers and
      // paths (`neuro_symb_dt2024`, `_pages/about.md`) are left alone.
      .replace(/(?<![\w_])_([^_]+)_(?![\w_])/g, '<i>$1</i>')
  );
}

function stripMarkdown(markdown: string): string {
  return dashes(markdown)
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/(?<![\w_])__?([^_]+)__?(?![\w_])/g, '$1')
    .trim();
}

export interface NewsFeed {
  source: string;
  items: NewsItem[];
  defects: NewsDefect[];
  fileCount: number;
}

let newsCache: NewsFeed | undefined;

export function news(): NewsFeed {
  if (newsCache) return newsCache;
  const base = join(ROOT, SOURCES.news);
  const files: string[] = [];
  for (const year of readdirSync(base)) {
    const directory = join(base, year);
    if (!statSync(directory).isDirectory()) continue;
    for (const file of readdirSync(directory))
      if (file.endsWith('.md')) files.push(join(directory, file));
  }
  files.sort();

  const items: NewsItem[] = [];
  const defects: NewsDefect[] = [];
  const seen = new Map<string, string>();
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const source = repoPath(file);
    const frontmatter = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
    const dateField = frontmatter && /^date:\s*(\d{4}-\d{2}-\d{2})/m.exec(frontmatter[1]);
    if (!dateField) {
      defects.push({
        source,
        problem: 'no `date` in the front matter; excluded from the feed',
        excluded: true,
      });
      continue;
    }
    const body = raw.slice(frontmatter[0].length).trim();
    const text = stripMarkdown(body);

    // Two files carrying the same body announce one thing, not two. The copy is
    // dropped, and the item its own filename names is therefore missing from the
    // site — which is worth saying out loud rather than quietly rendering twice.
    const duplicateOf = seen.get(normalise(text));
    if (duplicateOf) {
      defects.push({
        source,
        problem: `carries the body and date of ${duplicateOf}, so the item this filename names is not announced anywhere; excluded from the feed`,
        excluded: true,
      });
      continue;
    }
    seen.set(normalise(text), source);

    // Files are named MM-DD-… inside a YYYY directory, so the name is a second
    // record of the date. A disagreement is reported, and the front matter —
    // the field the site has always sorted by — wins.
    const named = /^(\d{2})-(\d{2})-/.exec(file.split('/').pop()!);
    if (named && `${named[1]}-${named[2]}` !== dateField[1].slice(5)) {
      defects.push({
        source,
        problem: `filename says ${named[1]}-${named[2]}, front matter says ${dateField[1].slice(
          5,
        )}; dated from the front matter`,
        excluded: false,
      });
    }
    const kind = KIND_RULES.find(([pattern]) => pattern.test(source))?.[1] ?? 'Note';
    items.push({
      source,
      date: new Date(`${dateField[1]}T00:00:00Z`),
      html: inlineHtml(body),
      text,
      kind,
    });
  }
  items.sort((a, b) => b.date.valueOf() - a.date.valueOf());
  newsCache = { source: `${SOURCES.news}/*/*.md`, items, defects, fileCount: files.length };
  return newsCache;
}

// ------------------------------------------------------------- the gap -----

export interface Gap {
  title: string;
  announced: Date;
  source: string;
}

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Papers the news feed announces as accepted that have no BibTeX entry. This is
 * the honest version of "the bibliography is behind": it is a set difference
 * between two files in this repository, so it shrinks by itself as entries are
 * added and disappears entirely when the bibliography catches up. Nothing states
 * a gap that is not currently true.
 */
export function bibliographyGaps(): Gap[] {
  const titles = new Set(bibliography().entries.map((entry) => normalise(entry.title)));
  const gaps: Gap[] = [];
  for (const item of news().items) {
    const claim = /^(.+?)\s+has been accepted/.exec(item.text);
    if (!claim) continue;
    const title = claim[1];
    if (titles.has(normalise(title))) continue;
    gaps.push({ title, announced: item.date, source: item.source });
  }
  return gaps;
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

// ---------------------------------------------------------- activities -----

export interface ActivityEntry {
  name: string;
  /** CORE rank or Scimago quartile, as linked in the source. */
  rank?: string;
  rankNote?: string;
  roles: string[];
}

export interface ActivitySection {
  title: string;
  entries: ActivityEntry[];
}

export interface Activities {
  source: string;
  sections: ActivitySection[];
}

let activitiesCache: Activities | undefined;

/**
 * `_pages/professional_activities.md` is a nested markdown list: `## Section`,
 * then `- **Name** ([Rank](url))`, then indented `  - **Role** (years)`.
 */
export function activities(): Activities {
  if (activitiesCache) return activitiesCache;
  const sections: ActivitySection[] = [];
  for (const line of read(SOURCES.activities).split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      sections.push({ title: heading[1], entries: [] });
      continue;
    }
    const section = sections[sections.length - 1];
    if (!section) continue;
    const role = /^\s+-\s+(.+?)\s*$/.exec(line);
    if (role) {
      section.entries[section.entries.length - 1]?.roles.push(stripMarkdown(role[1]));
      continue;
    }
    const entry = /^-\s+(.+?)\s*$/.exec(line);
    if (!entry) continue;
    const ranked = /^\*\*(.+?)\*\*\s*\(\[(.+?)\]\((.+?)\)\)\s*$/.exec(entry[1]);
    if (ranked) {
      const [rank, ...note] = ranked[2].split(/\s+in\s+/);
      section.entries.push({
        name: ranked[1],
        rank,
        rankNote: note.join(' in ') || undefined,
        roles: [],
      });
    } else {
      section.entries.push({ name: stripMarkdown(entry[1]), roles: [] });
    }
  }
  activitiesCache = {
    source: SOURCES.activities,
    sections: sections.filter((section) => section.entries.length > 0),
  };
  return activitiesCache;
}
