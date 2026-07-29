/**
 * The announcement feed, derived from the facts themselves.
 *
 * There is no news content in this repository. Every item below is generated
 * from a fact it already holds:
 *
 *   `cv/cv.yaml`               appointments, service roles and editions, awards
 *   `_bibliography/papers.bib` publications, preprints, released software
 *   `cv/pres.bib`              invited talks, oral and poster presentations
 *   `web/src/content/blog/`     writing
 *
 * A fact is announced on the date it carries. Most carry one already: a talk has
 * an ISO `date`, a post has a front-matter `date`, an award has a month, a paper
 * has at least a `year`. An `announced` key is written onto a fact only when the
 * announcement genuinely happened on a date the fact does not otherwise state.
 *
 * Nothing here invents a date. A fact whose finest available date is a year is
 * placed at the start of that year and **shown as a year**, so the feed never
 * claims a precision its sources do not have. `Announcement.precision` carries
 * that distinction to the page.
 */
import { parse } from 'yaml';
import type { CV } from './cv.ts';
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
 * The CV, read through `record.ts`'s walk-up-for-`_config.yml` root rather than
 * through `cv.ts`. `cv.ts` reads the same file through Vite's `?raw`, which only
 * exists inside an Astro build — importing it here would make this module, and
 * the feed's self-check, unrunnable under plain node. The type is imported, so
 * the two readers cannot disagree about the shape.
 */
const cv = parse(readSource(SOURCES.cv)) as CV;

export type Precision = 'year' | 'month' | 'day' | 'minute';

export interface Announcement {
  /** The date as the source states it: `2024`, `2024-10`, `2024-10-22`, or with a time. */
  stamp: string;
  /** The first instant of the period `stamp` names — the sort key, not a claim. */
  at: Date;
  precision: Precision;
  /** "Journal", "Service", "Talk", … — what kind of fact this is. */
  kind: string;
  /** Body as inline HTML. */
  html: string;
  text: string;
  /** The file the fact lives in. */
  source: string;
}

/** A fact that is announceable in principle but carries no defensible date. */
export interface Undated {
  what: string;
  why: string;
  source: string;
}

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
    stamp,
    at: instant(stamp, precision),
    precision,
    kind,
    html: inlineHtml(markdown),
    text: stripMarkdown(markdown),
    source,
  };
}

/** One full stop, not two: abbreviated venues already end in one ("Inf. Comput."). */
const sentence = (value: string) => (value.endsWith('.') ? value : `${value}.`);

/** `[text](url)` when the fact links somewhere, plain text when it does not. */
const link = (text: string, url?: string) => (url ? `[${text}](${url})` : text);

/** BibTeX wraps long field values across lines; the prose here is one line. */
const collapse = (value: string) =>
  value
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[{}]/g, '')
    .trim();

/**
 * A fact spliced into one of the markdown templates below, with the characters
 * that would otherwise be read as markup escaped the way the repository's own
 * markdown escapes them (`A\*` for the CORE rank). The bibliography really does
 * contain `OVERLAY@AI*IA 2019` and DOIs ending `…-7_26`, so without this a venue
 * name silently turns into emphasis. `inlineHtml` and `stripMarkdown` both
 * remove the backslashes again, so nothing reaches the page escaped.
 *
 * Prose the CV already writes in this markup — an award's `detail`, a service
 * `section` — is passed through as written; only machine-read fields are escaped.
 */
const md = (value: string) => collapse(value).replace(/([\\*_[\]])/g, '\\$1');

// ---------------------------------------------------------- the sources ----

function fromCv(into: Announcement[], undated: Undated[]): void {
  for (const post of cv.appointments) {
    if (!post.announced) continue;
    into.push(
      item(
        post.announced,
        'Appointment',
        sentence(
          `Started a new position as **${md(post.role)}** at ${link(
            md(post.organisation),
            post.url,
          )}`,
        ),
        SOURCES.cv,
      ),
    );
  }

  for (const entry of cv.service ?? []) {
    const where = link(md(entry.venue), entry.url) + (entry.section ? `, ${entry.section}` : '');
    if (entry.announced) {
      into.push(
        item(
          entry.announced,
          'Service',
          `Invited and accepted to serve as **${md(entry.role)}** for ${where}.`,
          SOURCES.cv,
        ),
      );
    }
    for (const edition of entry.years ?? []) {
      if (!edition.announced) {
        undated.push({
          what: `${entry.role}, ${stripMarkdown(entry.venue)} ${edition.year}`,
          why: 'the edition records a year but no announcement date, and the CV states no finer date for it',
          source: SOURCES.cv,
        });
        continue;
      }
      into.push(
        item(
          edition.announced,
          'Service',
          `Invited and accepted to serve as **${md(entry.role)}** for ${where} ${edition.year}.`,
          SOURCES.cv,
        ),
      );
    }
    if (!entry.announced && !entry.years) {
      undated.push({
        what: `${entry.role}, ${stripMarkdown(entry.venue)}`,
        why: 'the entry records no announcement date and no editions',
        source: SOURCES.cv,
      });
    }
  }

  for (const award of cv.awards) {
    const stamp = monthStamp(award.dates);
    if (!stamp) {
      undated.push({
        what: stripMarkdown(award.title),
        why: `\`dates: ${award.dates}\` is not a month the feed can read`,
        source: SOURCES.cv,
      });
      continue;
    }
    into.push(item(stamp, 'Award', sentence(`**${award.title}** — ${award.detail}`), SOURCES.cv));
  }
}

/**
 * A publication's announcement date, finest first: the `announced` field when
 * the announcement happened on a day the entry does not otherwise state, then
 * `month`+`year`, then `year` alone.
 */
function publicationStamp(entry: Publication): string | undefined {
  const announced = entry.fields.announced?.trim();
  if (announced && precisionOf(announced)) return announced;
  const year = entry.fields.year?.trim();
  if (!/^\d{4}$/.test(year ?? '')) return undefined;
  const month = MONTHS.indexOf((entry.fields.month ?? '').trim().slice(0, 3).toLowerCase());
  return month === -1 ? year : `${year}-${String(month + 1).padStart(2, '0')}`;
}

function fromBibliography(into: Announcement[], undated: Undated[]): void {
  for (const entry of bibliography().entries) {
    const stamp = publicationStamp(entry);
    if (!stamp) {
      undated.push({
        what: entry.title,
        why: 'the entry states no year',
        source: `${SOURCES.bibliography} (${entry.key})`,
      });
      continue;
    }
    const title = link(`**${md(entry.title)}**`, entry.link?.href);
    into.push(
      item(
        stamp,
        entry.kind,
        sentence(entry.venue ? `${title} — ${md(entry.venue)}` : title),
        `${SOURCES.bibliography} (${entry.key})`,
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
    // presentation", "Poster presentation"); the feed does not relabel it.
    // pres.bib is LaTeX like the bibliography is — `Krak{\'{o}}w`, `{HS3}` — so
    // its fields go through the same de-LaTeX pass before being escaped as
    // markdown.
    const field = (name: string) => md(deLatex(talk.fields[name] ?? ''));
    const what = field('note') || 'Talk';
    const where = [field('eventtitle'), field('venue')].filter(Boolean).join(', ');
    into.push(
      item(
        stamp,
        'Talk',
        sentence(`**${what}**: _${field('title')}_${where ? ` — ${where}` : ''}`),
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
    const description = field('description');
    into.push(
      item(
        stamp,
        'Writing',
        `New post: [${md(title)}${description ? ` — ${md(description)}` : ''}](/blog/${id}/)`,
        path,
      ),
    );
  }
}

// ----------------------------------------------------------- the feed ------

export interface Feed {
  items: Announcement[];
  /** Announceable facts with no defensible date, named rather than invented. */
  undated: Undated[];
  /** The files the feed is derived from, for the provenance block. */
  sources: string[];
}

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

  cache = {
    items,
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
