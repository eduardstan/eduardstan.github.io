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

/** Fields the dated blocks share. Prose fields carry the `inline.ts` grammar. */
interface Block {
  dates?: string;
  location?: string;
  items?: string[];
}

export interface Appointment extends Block {
  role: string;
  organisation: string;
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
  languages: { name: string; level: string }[];
  archive: { leadership: Leadership[] };
}

export const CV_SOURCE = SOURCES.cv;

export const cv = parse(raw) as CV;
