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

That same `exclude:` list carries a `cv/` entry, and `cv/` now exists: it holds the CV sources and
generated output, which must never appear on the published site. **Do not delete it as dead
configuration** — removing it is what would publish that material. It is only a publication guard,
though: it does not keep anything out of the git repository, so whatever under `cv/` must never be
committed is a plain `.gitignore` concern, separate from this entry.

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

## This repository is public

Never commit personal contact details. The captain's mobile number and personal
email live only in `cv/private.yaml`, which is gitignored (together with
`cv/generated/cv-contact-private.tex`). Public artefacts carry institutional
contact only. `cv/private.example.yaml` documents the shape.

## CV pipeline

The CV's facts live in exactly one place and both the PDF and (later) the site
are generated from it:

| File                       | Owns                                             |
| -------------------------- | ------------------------------------------------ |
| `cv/cv.yaml`               | all CV facts - the single source of truth        |
| `cv/private.yaml`          | private contact fields only; gitignored          |
| `_bibliography/papers.bib` | all publications, canonical for CV _and_ website |
| `cv/pres.bib`              | talks and presentations                          |
| `cv/cv.tex`                | layout and styling only                          |

- `node scripts/build-cv-data.mjs` renders `cv/cv.yaml` into
  `cv/generated/cv-data.tex` (committed, public). It always writes the gitignored
  private contact overlay too - the real one when `cv/private.yaml` exists, a
  no-op otherwise, so latexmk always has the dependency on record.
- `node scripts/build-cv-data.mjs --check` fails when the committed generated
  file is stale; CI runs it, so never hand-edit `cv/generated/`.
- Build with **xelatex** - `latexmk -xelatex -cd cv/cv.tex`. pdflatex fails:
  `academicons` needs TU encoding.
- The prose markup allowed in `cv.yaml` (`**bold**`, `_italic_`, `[text](url)`,
  and the typographic Unicode characters) is documented at the top of that file.
- `_bibliography/papers.bib` carries al-folio rendering fields (`abstract`,
  `pdf`, `html`, `selected`, ...) for the website. `cv.tex` strips them via
  `\DeclareSourcemap`, because abstracts contain raw `%` that would break the
  LaTeX pass. Do not "fix" the .bib to suit LaTeX.
- `cv.tex` leaves one `\small{` group deliberately unclosed after the Short Bio,
  exactly as the original hand-written CV did. Closing it reflows the whole
  document. There is a comment marking it.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
