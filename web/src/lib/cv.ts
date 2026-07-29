/**
 * The CV, read from `cv/cv.yaml` — the same file the LaTeX CV is generated from.
 *
 * The YAML arrives through Vite's `?raw` import rather than `readFileSync`.
 * A path built from `import.meta.url` builds fine and then fails at prerender
 * with ENOENT, because Astro relocates this module into `dist/.prerender/`
 * during `astro build` and the relative path follows the bundle rather than the
 * source. `?raw` inlines the file's text at build time, so there is no path to
 * resolve at all. (`src/lib/record.ts` solves the same problem the other way,
 * by walking up for `_config.yml`; it reads a whole directory, which `?raw`
 * cannot do.)
 *
 * Nothing here is transcribed: the interfaces below name the fields `cv.yaml`
 * already has, and every count the page shows is derived from this object.
 */
import { parse } from 'yaml';
import raw from '../../../cv/cv.yaml?raw';
import { SOURCES } from './record';

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

/** Fields the dated blocks share. Prose fields carry the `inline.ts` grammar. */
interface Block {
  dates?: string;
  location?: string;
  items?: string[];
  except?: Exception[];
}

export interface Appointment extends Block {
  role: string;
  organisation: string;
  url?: string;
  /**
   * ISO 8601 date the fact was announced, when the block's own `dates` range
   * does not already carry it at that precision. Optional everywhere it appears.
   */
  announced?: string;
}

/** One edition of a recurring service role (a conference year). */
export interface ServiceYear {
  year: number;
  announced?: string;
}

export interface ServiceEntry extends Block {
  role: string;
  venue: string;
  section?: string;
  /** "CORE Rank: A*", "IF: 6.5, Q1" — the file's own words for the ranking. */
  metric?: string;
  url?: string;
  /** Where `metric` is evidenced: a CORE portal or SCImago page. */
  rank_url?: string;
  announced?: string;
  years?: ServiceYear[];
}

/**
 * A funded research project. `funding` is deliberately not printed by the LaTeX
 * CV — the comment above `projects:` in the file says it is kept so the website
 * can use it, and `/projects/` is the site doing that.
 */
export interface Project extends Block {
  title: string;
  detail: string;
  url?: string;
  funding?: string;
}

export interface Degree extends Block {
  degree: string;
  institution: string;
}

export interface Course {
  course: string;
  programme: string;
  topics: string;
  hours: string;
}

export interface TeachingBlock extends Block {
  role: string;
  organisation: string;
  courses: Course[];
}

export interface Award extends Block {
  title: string;
  detail: string;
}

export interface SupervisionRow {
  level: string;
  count: string;
  notes: string;
}

export interface Leadership extends Block {
  role: string;
  detail: string;
}

export interface CV {
  research_focus: string;
  short_bio: string;
  appointments: Appointment[];
  education: Degree[];
  /** Keyed by institution shorthand (`unimib`, `academy`, `unife`). */
  teaching: Record<string, TeachingBlock>;
  supervision: {
    summary: string;
    topic_coverage: string;
    breakdown: SupervisionRow[];
  };
  awards: Award[];
  service: ServiceEntry[];
  projects: Project[];
  languages: { name: string; level: string }[];
  archive: { leadership: Leadership[] };
}

export const CV_SOURCE = SOURCES.cv;

/**
 * The field names a set of rows actually carries, so a source record names real
 * keys rather than the ones this file happens to declare.
 */
export const keysOf = (rows: object[]) =>
  [...new Set(rows.flatMap((row) => Object.keys(row)))].join(', ');

export const cv = parse(raw) as CV;

export interface ServiceGroup {
  role: string;
  entries: ServiceEntry[];
}

/**
 * `service[]` grouped by its own `role` field, roles in the order they first
 * appear in the file.
 *
 * Shared by `/professional_activities/` and the home page's service column so
 * the two cannot group the same list differently — the whole reason this reader
 * exists is that those two pages used to take these facts from two files.
 */
export function serviceGroups(): ServiceGroup[] {
  const groups: ServiceGroup[] = [];
  for (const entry of cv.service) {
    const group = groups.find((candidate) => candidate.role === entry.role);
    if (group) group.entries.push(entry);
    else groups.push({ role: entry.role, entries: [entry] });
  }
  return groups;
}

/**
 * Whether a role is an editorship, matched on the file's own word for it.
 *
 * The home page's "editorial boards" figure is this predicate applied to
 * `service[]`, not a number written anywhere. It is a text rule over the `role`
 * field rather than a list of venues, so a new editorship counts itself.
 */
export const isEditorial = (role: string) => /\beditor\b/i.test(role);

/** The dates column an entry states: a term, or the editions it served. */
export const serviceWhen = (entry: ServiceEntry) =>
  entry.dates ?? (entry.years ?? []).map((year) => year.year).join(', ');
