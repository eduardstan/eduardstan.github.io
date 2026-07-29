# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## One site lives in this repo

The Astro site in **`web/`** is the published site. `.github/workflows/deploy.yml` builds it
and publishes `web/dist` to the `gh-pages` branch; GitHub Pages serves `gh-pages`. The
Jekyll/al-folio site that used to live in the repository root was removed at the July 2026
cutover — `docs/url-parity.md` records what every URL it published does now.

**Pushing to `master` publishes within minutes.** `deploy.yml` has no path filters, on purpose:
the site reads the repository's own records at build time, so almost any file can change what
is published. Do not add filters back.

Three root paths survived the cutover because `web/` reads them, not because Jekyll did:
`_config.yml` (identity and footer accounts, and the landmark `repositoryRoot()` walks up for),
`_pages/about.md` (biography and affiliation lines) and `_bibliography/`. `cv/` and `scripts/`
are the CV pipeline. Deleting or renaming any of them breaks the build.

Rollback: the tag **`pre-astro-cutover`** on the remote is the last Jekyll commit.

## Sharp edges

- `.github/workflows/prettier.yml` runs `npx prettier . --check` over the **whole repo** with the
  root `.prettierrc` and no per-project dependencies installed, which constrains what a nested
  `.prettierrc` may declare — see "Notable configuration" in `web/README.md`.
- Astro 7's default Markdown processor (Sätteri) is **not** remark/rehype compatible, so `web/`
  opts back into the unified processor — see "Notable configuration" in `web/README.md`.
- **`.nojekyll` in `web/public/` is load-bearing.** GitHub Pages serves this repository with
  `build_type: legacy`, so it runs its own Jekyll pass over `gh-pages` and strips `_`-prefixed
  directories — including Astro's `_astro/`. Without that file the site publishes with no CSS
  and no JavaScript. `deploy.yml` asserts it is in `dist` before publishing.
- `web/` reads the repository root's records (`_bibliography/`, `_pages/about.md`, `cv/`,
  `_config.yml`) at build time through `web/src/lib/record.ts` and `web/src/lib/cv.ts`.
  `cv.yaml` feeds three routes, not one: `/cv/`, `/professional_activities/` (`service[]`) and
  `/projects/` (`projects[]`, funding figures included), and `cv/pres.bib` feeds `/talks/`.
  `record.ts` finds the root by walking up for `_config.yml` rather than from `import.meta.url`,
  because Astro relocates the bundle during `astro build`. The Ledger design requires every
  displayed count and source line to be derived there rather than written by hand — see
  "Notable configuration" in `web/README.md`.
- The CV and the site share `_bibliography/papers.bib`. The site displays every entry,
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
- `web/src/lib/legacy-urls.ts` is the one hand-written list on the site: the addresses the
  Jekyll site published that this one does not generate. It is a historical fact, not a record
  to derive from, and `docs/url-parity.md` explains every entry. Removing one turns a live URL
  into a silent 404.
- Text spliced into a generated announcement must go through that module's `md()` escaper: the
  bibliography really contains `OVERLAY@AI*IA 2019` and DOIs ending `…-7_26`, which would otherwise
  be read as markdown emphasis. `cv/pres.bib` is LaTeX like `papers.bib` is, so its fields need
  `deLatex()` first.

## The consistency gate

`web/src/lib/consistency.ts` compares the repository's records against each other and
**fails `astro build`** (never `astro dev`) when two hand-typed records of one fact
contradict. Joins are by being the same entry — never by matching prose; the design proved
name matching fails in both directions on this repository's data. `web/README.md` owns the
contract. Two things to know before touching it:

- **The Frontiers pair is correct, not a bug.** Appointed Mar 2024, announced 2025-03-03.
  The gate fires on it and `cv/cv.yaml` carries a declared `except:` for it. Do not "fix"
  either date; renew or re-argue the exception instead.
- Checks joining against the old `_pages/professional_activities.md` or `_news/` were designed
  and deliberately **not** built. Both files are gone; do not recreate a second copy of a fact
  in order to compare it against the first.

## Announcements

In `web/`, every announcement is derived from the fact it announces; there is no separate news
content. A fact is announced on the date it already carries — a talk's ISO `date`, a post's
front-matter `date`, an award's month, a paper's `year`. An `announced:` key is written **only**
where the announcement demonstrably happened on a date the fact does not otherwise state
(harvested from the old `_news/` before it was deleted); it is optional and additive everywhere, and
`scripts/build-cv-data.mjs` ignores it, so adding one leaves `cv/generated/cv-data.tex`
byte-identical — check with `--check`.

Dates are shown at the precision their source states and no finer: an item whose source records
only a year renders as a year. Never widen a date to a day the record does not support. A fact
with no defensible date is listed in the feed's `undated` array and shown in the provenance block,
not given an invented one.

The 22 hand-written `_news/` files are gone. Their permalinks redirect to `/news/` — see
`web/src/lib/legacy-urls.ts` and `docs/url-parity.md`. Do not reintroduce a news directory: an
announcement is generated from the fact it announces, and a second place to write one is the
drift this design closed.

## Settled decisions worth not relitigating

- The UniMiB lab is the **Intelligent Sensing Laboratory (ISLab)**. Any "Imaging and Vision
  Laboratory (IVL)" left anywhere is wrong.
- **No analytics and no visitor tracking.** The Jekyll site's `google_analytics` ID and its
  ClustrMaps globe went with it and are not coming back — not this provider, not another.
- **The bibliography is sacred and the site mirrors it.** There is no site-side publication
  filtering: manuscripts under review render publicly. Do not reintroduce a render-time filter.
- The Frontiers dates — appointed **Mar 2024**, announced **2025-03-03** — are both true and
  both recorded in `cv.yaml`. They are not a bug to reconcile.
- The al-folio template content (`_projects/`, `_drafts/`, the Einstein pages) was deleted at
  cutover, not migrated. `/projects/` now renders `cv/cv.yaml`'s real `projects[]`.
- **`LICENSE` stays exactly as it is** — MIT, "Copyright (c) 2022 Maruan Al-Shedivat".
  al-folio's attribution is preserved even though none of its code remains. Changing it is a
  captain decision.

## This repository is public

The captain's mobile number must not be committed or included in the CV. The personal Gmail
address is approved for publication.

## CV pipeline

The CV's facts live in exactly one place and both the PDF and the site are generated from it:

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
- The PDF is **built at deploy and never committed** — `deploy.yml` typesets it and stages it
  at `web/public/assets/cv.pdf`, which `.gitignore` covers, so `/cv/` can offer a current
  download without a binary entering git history. `cv.yml` builds the same document as a
  reviewable artifact. Both pin `texlive_version: "2024"`; `cv.yml` says why.
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
