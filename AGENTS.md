# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Two sites live in this repo

- **Repository root** — the Jekyll/al-folio site. This is what visitors see. It is built from
  `master` by `.github/workflows/deploy.yml` and published to the `gh-pages` branch by
  `JamesIves/github-pages-deploy-action`; GitHub Pages serves `gh-pages`.
- **`web/`** — an in-progress from-scratch Astro rebuild. Not deployed. See `web/README.md`.

Until an explicitly approved cutover, **nothing in `web/` may affect what is published.** The
guards are: `web/` and `node_modules` in the `exclude:` list of `_config.yml`, and
`.github/workflows/web-ci.yml` being build-only (`permissions: contents: read`, no deploy step).
When changing either site, verify the other still builds.

That same `exclude:` list carries a `cv/` entry, and `cv/` now exists. **Do not delete it as dead
configuration**: `/cv/` is already a page permalink, so copying the root source directory into the
Jekyll output risks colliding with that route.

## Sharp edges

- `.github/workflows/deploy.yml` triggers on broad globs (`**/*.md`, `**.yml`, `**.js`, …), so
  edits under `web/` re-run the Jekyll build and republish. That is safe only while `_config.yml`
  excludes `web/` — the output must stay byte-identical.
- `.github/workflows/prettier.yml` runs `npx prettier . --check` over the **whole repo** with the
  root `.prettierrc` and no per-project dependencies installed, which constrains what a nested
  `.prettierrc` may declare — see "Notable configuration" in `web/README.md`.
- Jekyll needs Ruby native extensions. There is no local `ruby-dev`; build it in Docker
  (`ruby:3.2.2` plus `imagemagick build-essential zlib1g-dev jupyter-nbconvert`), matching
  `deploy.yml`. Note the Docker daemon cannot see the agent sandbox's `/tmp`, so bind-mount a path
  inside the worktree.
- Astro 7's default Markdown processor (Sätteri) is **not** remark/rehype compatible, so `web/`
  opts back into the unified processor — see "Notable configuration" in `web/README.md`.
- `web/` reads the repository root's data files (`_bibliography/`, `_news/`, `_pages/`,
  `_config.yml`) at build time through `web/src/lib/record.ts`, so the two sites share one set of
  sources. That module finds the root by walking up for `_config.yml` rather than from
  `import.meta.url`, because Astro relocates the bundle during `astro build`. The Ledger design
  requires every displayed count and source line to be derived there rather than written by hand —
  see "Notable configuration" in `web/README.md`.
- The CV and both sites share `_bibliography/papers.bib`. The Astro rebuild displays every entry,
  including under-review manuscripts and software artifacts; `web/README.md` owns that index's
  filtering and labelling contract. The bibliography uses both `First Last` and `Last, First`
  BibTeX name forms; reading the second as the first silently renames authors.
- `web/src/lib/cv.ts` reads `cv/cv.yaml` through Vite's `?raw` import, not `node:fs`. Do **not**
  rewrite it as `readFileSync(new URL('../../../cv/cv.yaml', import.meta.url))`: that builds and
  then fails at prerender with `ENOENT`, for the same relocation reason as the bullet above.
  `?raw` inlines the file at build time, so there is no path to resolve; use `record.ts`'s
  walk-up-for-`_config.yml` only where a whole directory has to be read — or, as
  `announcements.ts` does, where the module also has to run under plain `node` in a self-check,
  which `?raw` cannot.
- `.github/workflows/web-ci.yml` therefore triggers on `cv/**` and `_bibliography/**` as well as
  `web/**`: an edit to either can break the Astro build without touching `web/`.
- `_news/` still exists but **nothing in `web/` reads it**. It is kept only so the live Jekyll
  site's news section keeps working until the cutover, which deletes it — the same parity-first
  holding pattern `_pages/cv.md` was in. Every date it carried now lives on the fact itself, so do
  not add a file there and do not treat it as a source; see "Announcements" below.
- Text spliced into a generated announcement must go through that module's `md()` escaper: the
  bibliography really contains `OVERLAY@AI*IA 2019` and DOIs ending `…-7_26`, which would otherwise
  be read as markdown emphasis. `cv/pres.bib` is LaTeX like `papers.bib` is, so its fields need
  `deLatex()` first.

## Announcements

In `web/`, every announcement is derived from the fact it announces; there is no separate news
content. A fact is announced on the date it already carries — a talk's ISO `date`, a post's
front-matter `date`, an award's month, a paper's `year`. An `announced:` key is written **only**
where the announcement demonstrably happened on a date the fact does not otherwise state
(harvested from `_news/`); it is optional and additive everywhere, and
`scripts/build-cv-data.mjs` ignores it, so adding one leaves `cv/generated/cv-data.tex`
byte-identical — check with `--check`.

Dates are shown at the precision their source states and no finer: an item whose source records
only a year renders as a year. Never widen a date to a day the record does not support. A fact
with no defensible date is listed in the feed's `undated` array and shown in the provenance block,
not given an invented one.

**The root Jekyll site has no generator for this** and still renders `_news/` through
`_includes/news.liquid`. So the two sites' news differ by construction — Jekyll shows the 22
hand-written files, `web/` shows the generated feed — and that is deliberate until the cutover.
Deleting `_news/` before then takes the live news page down.

## This repository is public

The captain's mobile number must not be committed or included in the CV. The personal Gmail
address is approved for publication.

## CV pipeline

The CV's facts live in exactly one place and both the PDF and (later) the site
are generated from it:

| File                       | Owns                                             |
| -------------------------- | ------------------------------------------------ |
| `cv/cv.yaml`               | all CV facts - the single source of truth        |
| `_bibliography/papers.bib` | all publications, canonical for CV _and_ website |
| `cv/pres.bib`              | talks and presentations                          |
| `cv/cv.tex`                | layout and styling only                          |

- `node scripts/build-cv-data.mjs` renders `cv/cv.yaml` into
  `cv/generated/cv-data.tex` (committed, public).
- `node scripts/build-cv-data.mjs --check` fails when the committed generated
  file is stale; CI runs it, so never hand-edit `cv/generated/`.
- Build with **xelatex** - `latexmk -xelatex -cd cv/cv.tex`. pdflatex fails:
  `academicons` needs TU encoding.
- The prose markup allowed in `cv.yaml` (`**bold**`, `_italic_`, `[text](url)`,
  and the typographic Unicode characters) is documented at the top of that file.
- `_bibliography/papers.bib` may carry al-folio rendering fields (`abstract`,
  `pdf`, `html`, `selected`, ...) for the website. `cv.tex` strips them via
  `\DeclareSourcemap` when present, because abstracts can contain raw `%` that
  would break the LaTeX pass. Do not "fix" the .bib to suit LaTeX.
- `cv.tex` leaves one `\small{` group deliberately unclosed after the Short Bio,
  exactly as the original hand-written CV did. Closing it reflows the whole
  document. There is a comment marking it.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
