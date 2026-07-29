/**
 * The shape of `content/cv.yaml`, and the pure functions over it.
 *
 * Split out of `cv.ts` because that module reads the file through Vite's `?raw`,
 * which only exists inside an Astro build. `announcements.ts` and
 * `consistency.ts` also run under plain `node` in the self-checks, so they read
 * the file themselves and share these types and helpers rather than declaring
 * their own — the readers cannot disagree about the shape.
 *
 * Nothing here is transcribed: the interfaces below name the fields
 * `content/cv.yaml` already has.
 */

/**
 * A declared exception to one consistency check, on the fact it excuses.
 *
 * Not a suppressions file and not a flag: it lives in the data beside what it
 * silences, it names exactly one check, it states a reason that is rendered to
 * the reader, and it carries an expiry or an explicit permanent scope.
 * `src/lib/consistency.ts` enforces all four rules on the exception itself — an
 * unknown check id or a blank reason fails the build, because a typo must never
 * look like a successful excuse.
 */
export interface Exception {
  /** One check id from `CHECKS` in `src/lib/consistency.ts`. No wildcards. */
  check: string;
  because: string;
  /** ISO day, or the explicit non-expiring marker `permanent`. */
  until: string;
}

/** One edition of a recurring role: a bare year, or a year that was announced. */
export type Edition = number | { year: number; announced?: string };

/** The year an edition states, whichever of the two shapes it is written in. */
export const editionYear = (edition: Edition) =>
  typeof edition === 'number' ? edition : edition.year;

/** The announcement date an edition carries, where it carries one. */
export const editionAnnounced = (edition: Edition) =>
  typeof edition === 'number' ? undefined : edition.announced;

/**
 * One entry, and there is only one entry shape.
 *
 * An appointment, a degree, a teaching post, a service role, a project, an
 * award, a supervision row and a leadership role are all this. The six
 * interfaces that used to say almost the same thing are gone: `title` is what it
 * was, `org` is where, and the section-specific extras below are optional
 * everywhere. Prose fields carry the `inline.ts` grammar.
 */
export interface Entry {
  /** What it was. The only field that is not optional. */
  title: string;
  /** Where it was — institution, journal, conference. */
  org?: string;
  /** The city. */
  place?: string;
  dates?: string;
  /** One short line more. Printed beside `org` on a line that does not wrap. */
  detail?: string;
  /** The site links `org` to this. */
  url?: string;
  items?: string[];
  /**
   * ISO 8601 date the fact was announced, when the entry's own `dates` range
   * does not already carry it at that precision. Optional everywhere.
   */
  announced?: string;
  except?: Exception[];

  // -- section-specific extras, all optional --
  /** "CORE Rank: A*", "IF: 6.5, Q1" — the file's own words for a ranking. */
  metric?: string;
  /** Where `metric` is evidenced: a CORE portal or SCImago page. */
  rank_url?: string;
  /** Editions of a recurring role. */
  years?: Edition[];
  /** Grant or programme amount. Website only — the printed CV never carries it. */
  funding?: string;
  /** How many. A table column, in a section rendered as a table. */
  count?: string | number;
  /** A table hanging under the entry: each row's keys, in order, are the columns. */
  rows?: Record<string, string>[];
}

/** A section is a list of entries, or a list with a paragraph above it. */
export type Section = Entry[] | { note?: string | string[]; entries: Entry[] };

/** The entries of a section, whichever of the two shapes it is written in. */
export const entriesOf = (section: Section | undefined): Entry[] =>
  Array.isArray(section) ? section : section?.entries ?? [];

/** The paragraphs above a section's entries, as a list. */
export const noteOf = (section: Section | undefined): string[] =>
  Array.isArray(section) || !section?.note ? [] : [section.note].flat();

export interface Profile {
  name: string;
  site?: string;
  headline?: string;
  affiliation?: { label: string; url?: string }[];
  place?: string;
  /** Street-level postal lines. Website only; the printed CV never carries them. */
  address?: string[];
  email?: string;
  website?: { label: string; url: string };
  links?: Record<string, string>;
  portrait?: string;
  favicon?: string;
  bio?: { short?: string; long?: string };
  focus?: string;
  footer?: string;
}

/**
 * `content/cv.yaml`.
 *
 * `profile` is the only key this type names, because it is the only one the
 * generator names too. Every other top-level key is a section by construction —
 * an adopter may add `fieldwork:` and the printed CV will render it — so the
 * index signature is the shape, not a gap in the typing. The keys listed below
 * are the ones the website has a route for.
 */
export interface CV extends Record<string, Section | Profile | undefined> {
  profile: Profile;
  appointments?: Section;
  education?: Section;
  teaching?: Section;
  supervision?: Section;
  awards?: Section;
  service?: Section;
  projects?: Section;
  languages?: Section;
  leadership?: Section;
}

/** Every top-level section, in file order. `profile:` is not one. */
export const sections = (source: CV): [string, Section][] =>
  Object.entries(source).filter(
    ([key, value]) =>
      key !== 'profile' &&
      (Array.isArray(value) || Array.isArray((value as { entries?: unknown })?.entries)),
  ) as [string, Section][];

/**
 * The field names a set of rows actually carries, so a source record names real
 * keys rather than the ones this file happens to declare.
 */
export const keysOf = (rows: object[]) =>
  [...new Set(rows.flatMap((row) => Object.keys(row)))].join(', ');

/**
 * Whether a role is an editorship, matched on the file's own word for it.
 *
 * The home page's "editorial boards" figure is this predicate applied to
 * `service[]`, not a number written anywhere. It is a text rule over the `title`
 * field rather than a list of venues, so a new editorship counts itself.
 */
export const isEditorial = (role: string) => /\beditor\b/i.test(role);

/** The dates column an entry states: a term, or the editions it served. */
export const serviceWhen = (entry: Entry) =>
  entry.dates ?? (entry.years ?? []).map(editionYear).join(', ');

export interface ServiceGroup {
  role: string;
  entries: Entry[];
}

/**
 * Service entries grouped by their own `title` field, roles in the order they
 * first appear in the file.
 *
 * Shared by `/professional_activities/` and the home page's service column so
 * the two cannot group the same list differently — the whole reason this reader
 * exists is that those two pages used to take these facts from two files.
 */
export function groupByTitle(entries: Entry[]): ServiceGroup[] {
  const groups: ServiceGroup[] = [];
  for (const entry of entries) {
    const group = groups.find((candidate) => candidate.role === entry.title);
    if (group) group.entries.push(entry);
    else groups.push({ role: entry.title, entries: [entry] });
  }
  return groups;
}
