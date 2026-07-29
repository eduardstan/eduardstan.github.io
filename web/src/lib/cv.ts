/**
 * The CV, read from `content/cv.yaml` — the same file the LaTeX CV is generated
 * from.
 *
 * The YAML arrives through Vite's `?raw` import rather than `readFileSync`.
 * A path built from `import.meta.url` builds fine and then fails at prerender
 * with ENOENT, because Astro relocates this module into `dist/.prerender/`
 * during `astro build` and the relative path follows the bundle. `?raw` inlines
 * the file's text at build time, so there is no path to resolve at all.
 * (`src/lib/record.ts` solves the same problem the other way, by walking up for
 * `content/cv.yaml`; it reads a whole directory, which `?raw` cannot do.)
 *
 * The shape and the pure functions over it live in `cv-schema.ts`, which this
 * module re-exports: they are shared with `announcements.ts` and
 * `consistency.ts`, which read the same file under plain node.
 */
import { parse } from 'yaml';
import raw from '../../../content/cv.yaml?raw';
import { SOURCES } from './record';
import { entriesOf, groupByTitle, sections as sectionsOf, type CV } from './cv-schema';

export * from './cv-schema';

export const CV_SOURCE = SOURCES.cv;

export const cv = parse(raw) as CV;

/** Every top-level section of this CV, in file order. `profile:` is not one. */
export const sections = () => sectionsOf(cv);

export const service = () => entriesOf(cv.service);

/** Service grouped by role — the home page and `/professional_activities/`. */
export const serviceGroups = () => groupByTitle(service());
