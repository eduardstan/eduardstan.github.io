/**
 * The announcement feed, derived from the facts themselves.
 *
 * There is no news content in this repository. Every item below is generated
 * from a fact it already holds:
 *
 *   `content/cv.yaml`          every section — appointments, service, awards, …
 *   `content/publications.bib` publications, preprints, released software
 *   `content/talks.bib`        invited talks, oral and poster presentations
 *   `content/posts/`           writing
 *
 * A fact is announced on the date it carries. Most carry one already: a talk has
 * an ISO `date`, a post has a front-matter `date`, an award has a month, a paper
 * has at least a `year`. An `announced` key is written onto a fact only when the
 * announcement genuinely happened on a date the fact does not otherwise state.
 *
 * Nothing here invents a date. A fact whose finest available date is a year is
 * placed at the start of that year and **shown as a year**, so the feed never
 * claims a precision its sources do not have. `Announcement.precision` carries
 * that distinction to the page. A fact with no defensible date at all is not
 * guessed at: it is listed, with the reason, in `undated`.
 */
import { parse } from 'yaml';
import { entriesOf, isEditorial, sections, type CV } from './cv-schema.ts';
import {
  bibliography,
  deLatex,
  inlineHtml,
  listSources,
  parseBib,
  readSource,
  SOURCES,
  stripMarkdown,
  type Publication,
} from './record.ts';

/**
 * The CV, read through `record.ts`'s walk-up-for-`content/cv.yaml` root rather
 * than through `cv.ts`. `cv.ts` reads the same file through Vite's `?raw`, which
 * only exists inside an Astro build — importing it here would make this module,
 * and the feed's self-check, unrunnable under plain node. The types are
 * imported, so the two readers cannot disagree about the shape.
 */
const cv = parse(readSource(SOURCES.cv)) as CV;

export type Precision = 'year' | 'month' | 'day' | 'minute';

export interface Announcement {
  /**
   * A stable anchor for this item, derived from its stamp and its text. There
   * is no page per announcement, so this is the finest address one has: the
   * feed links to `/lately/#id` and the RSS item's guid is the same URL.
   */
  id: string;
  /** The date as the source states it: `2024`, `2024-10`, `2024-10-22`, or with a time. */
  stamp: string;
  /** The first instant of the period `stamp` names — the sort key, not a claim. */
  at: Date;
  precision: Precision;
  /** "Journal", "Service", "Invited talk", … — what kind of fact this is. */
  kind: string;
  /** Body as inline HTML. */
  html: string;
  text: string;
  /**
   * The record this was generated from, exactly: the file, plus the BibTeX key
   * or the `cv.yaml` list and entry title inside it. This is what the inspect
   * switch shows under the item, so it must name one entry and not just a file.
   */
  source: string;
}

/** A fact that is announceable in principle but carries no defensible date. */
export interface Undated {
  what: string;
  why: string;
  source: string;
}

// ------------------------------------------------------- the templates -----
//
// ONE CANONICAL TEMPLATE PER KIND, AND THIS IS THE WHOLE TABLE. If you are
// reusing this site, this is the first thing you will want to edit.
//
// The grammar is **what it was, then where**. The kind is NOT in the sentence:
// it is already on the mono apparatus line beside the date (`date · kind`), so
// repeating it in prose says the same thing twice. The venue carries the link
// for anything whose URL identifies a place; a publication's only URL is its
// DOI, which identifies the paper, so there the title carries it.
//
// Each template returns the segments of one sentence. They are joined with
// `, ` after the empty ones are dropped, so a fact missing a slot loses that
// slot AND its separator — never a dangling comma, never an empty parenthesis.
// `what` and `where` already carry their emphasis and their link.

interface Slots {
  /** What it was: a role, a title, a paper. */
  what: string;
  /** Where it was: an institution, a venue, an event — linked where it links. */
  where?: string;
  /** One more qualifier: a journal section, a city. */
  detail?: string;
  /** The edition of a recurring role. */
  year?: string;
}

export const TEMPLATES: Record<string, (s: Slots) => (string | undefined)[]> = {
  //  kind on the mono line     the sentence, one segment per comma
  Appointment: (s) => [`**${s.what}**`, s.where],
  Editorial: (s) => [`**${s.what}**`, s.where, s.detail],
  Service: (s) => [`**${s.what}**`, [s.where, s.year].filter(Boolean).join(' ') || undefined],
  Award: (s) => [`**${s.what}**`, s.where ?? s.detail],
  Talk: (s) => [`_${s.what}_`, s.where],
  Submitted: (s) => [`**${s.what}**`, s.where && `submitted to ${s.where}`],
  Writing: (s) => [`**${s.what}**`],
  // Every other kind — the bibliography's Journal, Conference, Workshop,
  // Chapter, Book, Software, …, and any CV section an adopter invents. An entry
  // that states only `detail` (a project, an award) reads off it, which is the
  // same fallback the printed CV's second line makes.
  default: (s) => [`**${s.what}**`, s.where ?? s.detail],
};

/**
 * The sentence for a template, or the default one. One full stop, never two.
 *
 * The name is a key of `TEMPLATES` above, chosen by the caller from what the
 * record structurally is — `Talk`, `Writing`, `Submitted`. Where a caller
 * passes a display label through instead, an unrecognised one is not an error:
 * it takes `default`, which is the sentence every group the captain's `short`
 * names does not have wording of its own already gets.
 */
export function say(name: string, slots: Slots): string {
  const template = TEMPLATES[name] ?? TEMPLATES.default;
  const line = template(slots).filter(Boolean).join(', ');
  return line.endsWith('.') ? line : `${line}.`;
}

/**
 * The short name of a venue: the acronym it puts in brackets, where it has one.
 *
 * `International Joint Conference on Artificial Intelligence (IJCAI)` is how a
 * CV names a conference and `IJCAI 2026` is how a sentence does. A bracket
 * holding several words is a lab or a group, not an acronym — `University of
 * Milano-Bicocca (Intelligent Sensing Laboratory—ISLab)` stays as written.
 */
export const shortVenue = (name: string) => /\(([^\s()]{2,12})\)/.exec(name)?.[1] ?? name;

// ------------------------------------------------------------- dates -------

/**
 * How much of a date a stamp actually states. A stamp is trusted to be ISO 8601;
 * anything else is rejected by the callers below rather than guessed at.
 */
function precisionOf(stamp: string): Precision | undefined {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stamp)) return 'minute';
  if (/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return 'day';
  if (/^\d{4}-\d{2}$/.test(stamp)) return 'month';
  if (/^\d{4}$/.test(stamp)) return 'year';
  return undefined;
}

/**
 * The first instant of the period a stamp names, in UTC. A year-precision stamp
 * sorts at 1 January; the page renders it as a year, so the instant is only ever
 * a sort key.
 */
function instant(stamp: string, precision: Precision): Date {
  if (precision === 'year') return new Date(`${stamp}-01-01T00:00:00Z`);
  if (precision === 'month') return new Date(`${stamp}-01T00:00:00Z`);
  if (precision === 'day') return new Date(`${stamp}T00:00:00Z`);
  return new Date(stamp);
}

/** `Nov 2021` — the CV's own spelling of a month — as `2021-11`. */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function monthStamp(dates: string | undefined): string | undefined {
  const match = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/.exec((dates ?? '').trim());
  if (!match) return undefined;
  const month = MONTHS.indexOf(match[1].toLowerCase());
  if (month === -1) return undefined;
  return `${match[2]}-${String(month + 1).padStart(2, '0')}`;
}

// ------------------------------------------------------------ assembly -----

function item(stamp: string, kind: string, markdown: string, source: string): Announcement {
  const precision = precisionOf(stamp);
  if (!precision) throw new Error(`Not an ISO 8601 date: ${stamp} (${source}, "${markdown}")`);
  return {
    id: '', // assigned once the feed is ordered, below.
    stamp,
    at: instant(stamp, precision),
    precision,
    kind,
    html: inlineHtml(markdown),
    text: stripMarkdown(markdown),
    source,
  };
}

/** `[text](url)` when the fact links somewhere, plain text when it does not. */
const link = (text: string, url?: string) => (url ? `[${text}](${url})` : text);

/** BibTeX wraps long field values across lines; the prose here is one line. */
const collapse = (value: string) =>
  value
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[{}]/g, '')
    .trim();

/**
 * A fact spliced into one of the templates above, with the characters that would
 * otherwise be read as markup escaped the way the repository's own markdown
 * escapes them (`A\*` for the CORE rank). The bibliography really does contain
 * `OVERLAY@AI*IA 2019` and DOIs ending `…-7_26`, so without this a venue name
 * silently turns into emphasis. `inlineHtml` and `stripMarkdown` both remove the
 * backslashes again, so nothing reaches the page escaped.
 *
 * Prose the CV already writes in this markup — an award's `detail`, a service
 * `detail` — is passed through as written; only machine-read fields are escaped.
 */
const md = (value: string | undefined) =>
  value ? collapse(value).replace(/([\\*_[\]])/g, '\\$1') : '';

// ---------------------------------------------------------- the sources ----

/**
 * `appointments` → `Appointment`, `awards` → `Award`, `teaching` → `Teaching`.
 * The kind of a CV fact is the name of the section it is in, and this module
 * names no section: an adopter's `fieldwork:` announces as `Fieldwork`.
 */
const singular = (key: string) => {
  const word = key.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  const stem = /(?:ss|is|us)$/.test(word) ? word : word.replace(/s$/, '');
  return stem.charAt(0).toUpperCase() + stem.slice(1);
};

function fromCv(into: Announcement[], undated: Undated[]): void {
  for (const [key, section] of sections(cv)) {
    const entries = entriesOf(section);
    // An entry with nothing to date it is only a gap where the section's facts
    // announce at all. `languages:` and `supervision:` are states, not events,
    // and listing every one of their rows as "undated" would be noise.
    const announces = entries.some(
      (entry) =>
        entry.announced ??
        monthStamp(entry.dates) ??
        (entry.years ?? []).some((edition) => typeof edition === 'object' && edition.announced),
    );

    for (const entry of entries) {
      // An editorship is an editorship whichever section it sits in; the mono
      // line gets the right word for free from the rule the home page already
      // counts with.
      const kind = isEditorial(entry.title) ? 'Editorial' : singular(key);
      const what = md(entry.title);
      const where = link(md(shortVenue(entry.org ?? '')), entry.url) || undefined;
      const detail = entry.detail;
      const subject = `${stripMarkdown(entry.title)}${
        entry.org ? `, ${stripMarkdown(entry.org)}` : ''
      }`;

      // The provenance a reader gets under the inspect switch: the file, the
      // list inside it, and the entry's own title. There is no line number —
      // `cv.yaml` is read as a parsed document here, not as text — but the
      // triple names exactly one entry.
      const record = `${SOURCES.cv} (${key}[] · ${stripMarkdown(entry.title)})`;

      const stamp = entry.announced ?? monthStamp(entry.dates);
      if (stamp) into.push(item(stamp, kind, say(kind, { what, where, detail }), record));

      for (const edition of entry.years ?? []) {
        const year = typeof edition === 'number' ? edition : edition.year;
        const announced = typeof edition === 'number' ? undefined : edition.announced;
        if (!announced) {
          undated.push({
            what: `${subject} ${year}`,
            why: 'the edition records a year but no announcement date, and the CV states no finer date for it',
            source: record,
          });
          continue;
        }
        into.push(
          item(announced, kind, say(kind, { what, where, detail, year: String(year) }), record),
        );
      }

      if (announces && !stamp && !entry.years?.length && !entry.dates) {
        undated.push({
          what: subject,
          why: 'the entry records no announcement date, no term and no editions',
          source: record,
        });
      }
    }
  }
}

/**
 * A publication's announcement date, finest first: the `announced` field when
 * the announcement happened on a day the entry does not otherwise state, then
 * `month`+`year`, then `year` alone.
 *
 * A manuscript **under review** is the one exception, and it is the rule rather
 * than a special case: its `year` is the year it is aimed at, not a year in
 * which anything happened, so there is no date to announce it on. Give it an
 * `announced:` — the day it was submitted — and it announces like anything else.
 * Without one it stays fully visible on `/publications/` and is named in
 * `undated` below.
 *
 * `underReview` is read off the entry's own record in `record.ts`, not off the
 * `short` name of the section it lands in: renaming that label is a display
 * change, and it must not put five unannounced manuscripts on the front page
 * dated to the year they are aimed at.
 */
function publicationStamp(entry: Publication): string | undefined {
  const announced = entry.fields.announced?.trim();
  if (announced && precisionOf(announced)) return announced;
  if (entry.underReview) return undefined;
  const year = entry.fields.year?.trim();
  if (!/^\d{4}$/.test(year ?? '')) return undefined;
  const month = MONTHS.indexOf((entry.fields.month ?? '').trim().slice(0, 3).toLowerCase());
  return month === -1 ? year : `${year}-${String(month + 1).padStart(2, '0')}`;
}

function fromBibliography(into: Announcement[], undated: Undated[]): void {
  for (const entry of bibliography().entries) {
    const stamp = publicationStamp(entry);
    const source = `${SOURCES.bibliography} (${entry.key})`;
    if (!stamp) {
      undated.push({
        what: entry.title,
        why: entry.underReview
          ? 'a manuscript under review states the year it is aimed at, not a date anything happened on; add `announced` with the submission date to announce it'
          : 'the entry states no year',
        source,
      });
      continue;
    }
    into.push(
      item(
        stamp,
        entry.kind,
        say(entry.underReview ? 'Submitted' : entry.kind, {
          what: link(md(entry.title), entry.link?.href),
          where: md(entry.venue) || undefined,
        }),
        source,
      ),
    );
  }
}

function fromTalks(into: Announcement[], undated: Undated[]): void {
  for (const talk of parseBib(readSource(SOURCES.talks))) {
    const stamp = talk.fields.date?.trim();
    const source = `${SOURCES.talks} (${talk.key})`;
    if (!stamp || !precisionOf(stamp)) {
      undated.push({ what: talk.fields.title ?? talk.key, why: 'no ISO `date` field', source });
      continue;
    }
    // `note` is the talk's own word for what it was ("Invited talk", "Oral
    // presentation", "Poster presentation"), and it belongs on the apparatus
    // line rather than in the sentence. The feed does not relabel it.
    // talks.bib is LaTeX like the bibliography is — `Krak{\'{o}}w`, `{HS3}` — so
    // its fields go through the same de-LaTeX pass before being escaped as
    // markdown.
    const field = (name: string) => md(deLatex(talk.fields[name] ?? ''));
    into.push(
      item(
        stamp,
        field('note') || 'Talk',
        say('Talk', {
          what: field('title'),
          where: [field('eventtitle'), field('venue')].filter(Boolean).join(', ') || undefined,
        }),
        source,
      ),
    );
  }
}

function fromPosts(into: Announcement[], undated: Undated[]): void {
  for (const path of listSources(SOURCES.posts, ['.md', '.mdx'])) {
    const raw = readSource(path);
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? '';
    const data = parse(frontmatter) as Record<string, unknown> | null;
    if (data?.draft === true) continue;
    const field = (key: string) => (typeof data?.[key] === 'string' ? data[key] : undefined);
    const stamp = field('date');
    const title = field('title');
    if (!stamp || !precisionOf(stamp) || !title) {
      undated.push({
        what: title ?? path,
        why: 'the front matter states no `date` and `title` pair the feed can read',
        source: path,
      });
      continue;
    }
    const id = path.slice(`${SOURCES.posts}/`.length).replace(/\.(?:md|mdx)$/, '');
    into.push(
      item(stamp, 'Writing', say('Writing', { what: link(md(title), `/blog/${id}/`) }), path),
    );
  }
}

// ----------------------------------------------------------- the feed ------

/** One kind of fact, with how many items of it the feed holds. */
export interface Kind {
  /** As it is printed on the apparatus line: `Journal`, `Invited talk`. */
  name: string;
  /** The same, as an HTML id fragment: `invited-talk`. */
  slug: string;
  count: number;
}

export interface Feed {
  items: Announcement[];
  /** The kinds present, most items first — the filter's whole vocabulary. */
  kinds: Kind[];
  /** Announceable facts with no defensible date, named rather than invented. */
  undated: Undated[];
  /** The files the feed is derived from, for the provenance block. */
  sources: string[];
}

/** Words to an HTML id fragment: lowercase, ASCII, hyphens, nothing else. */
export const slug = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

let cache: Feed | undefined;

export function announcements(): Feed {
  if (cache) return cache;
  const items: Announcement[] = [];
  const undated: Undated[] = [];
  fromCv(items, undated);
  fromBibliography(items, undated);
  fromTalks(items, undated);
  fromPosts(items, undated);

  // Newest first. Two facts sharing an instant are ordered by precision — a
  // dated announcement outranks a bare year that merely starts the same period —
  // and then by text, so the build is reproducible.
  const RANK: Record<Precision, number> = { minute: 3, day: 2, month: 1, year: 0 };
  items.sort(
    (a, b) =>
      b.at.valueOf() - a.at.valueOf() ||
      RANK[b.precision] - RANK[a.precision] ||
      a.text.localeCompare(b.text),
  );

  // The anchor is the item's own stamp and words, so it survives a rebuild;
  // the counter only ever fires if two items say the same thing on the same
  // date, and then it keeps both addressable rather than colliding.
  const taken = new Map<string, number>();
  for (const announcement of items) {
    const stem = slug(`${announcement.stamp} ${announcement.text}`).slice(0, 80).replace(/-$/, '');
    const seen = taken.get(stem) ?? 0;
    taken.set(stem, seen + 1);
    announcement.id = seen === 0 ? stem : `${stem}-${seen + 1}`;
  }

  const counts = new Map<string, number>();
  for (const announcement of items)
    counts.set(announcement.kind, (counts.get(announcement.kind) ?? 0) + 1);

  cache = {
    items,
    kinds: [...counts]
      .map(([name, count]) => ({ name, slug: slug(name), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    undated,
    sources: [SOURCES.cv, SOURCES.bibliography, SOURCES.talks, `${SOURCES.posts}/**/*.{md,mdx}`],
  };
  return cache;
}

/** The date as the source states it, never finer. */
export function formatStamp(announcement: Announcement): string {
  const { stamp, precision } = announcement;
  if (precision === 'year') return stamp;
  const calendarDate = new Date(
    `${precision === 'month' ? `${stamp}-01` : stamp.slice(0, 10)}T00:00:00Z`,
  );
  if (precision === 'month')
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(calendarDate);
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    calendarDate,
  );
}
