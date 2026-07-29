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

## `content/` is the interface

**Every adopter-owned record and media asset is in `content/`** — `cv.yaml`,
`publications.bib`, `talks.bib`, `posts/`, `media/`. `content/README.md` is the documentation
for that interface, including the two authored-layout exceptions an adopter must review, and is
written for a stranger adopting the repository, not for us. `web/src/lib/record.ts`'s `SOURCES`
is the whole list of records the site reads; `record.test.ts` fails if an entry of it ever points
outside `content/`.

`content/cv.yaml` is also the **repo-root landmark** `repositoryRoot()` walks up for, chosen
because it is the one file the site cannot run without. `cv/` and `scripts/` are the CV
pipeline and `cv/cv.tex` is layout only.

**One entry shape, and a top-level list is a section by construction.** `title` is the only
required field; `org`, `place`, `dates`, `detail`, `url`, `items`, `announced` and the optional
extras (`metric`, `rank_url`, `years`, `funding`, `count`, `rows`) are the rest.
`scripts/build-cv-data.mjs` names no section: every list becomes six `\cv<Section>*` macros and
`cv/cv.tex` prints the ones it has a `\cvpart` line for. Adding a section to the YAML must
never require editing the generator.

**Publication and talk grouping is declared too.** `publications:` and `talks:` are the two
top-level keys holding `sections:` rather than entries — a section is a `title` plus a filter
(`types` any, `keywords` all, `exclude_keywords` none), and that is the whole grammar. The
generator translates each into its `\defbibfilter` and `\printbibliography` plus `\cv<Key>Key` /
`\cv<Key>Sections`; `web/src/lib/record.ts` matches entries against the same list for the Type
column and the "by type" order. **No BibTeX entry type is named in `cv/cv.tex` or in the website's
source, and none may be reintroduced there** — that hard-coding is what this replaced. `printed:
false` names a group for the site without a PDF section (how `@misc` is "Software" today); adding
one to the printed CV is a captain decision, because it moves the baseline.

**Two matchers, one declaration — keep them provably equal.** biblatex/Biber selects the printed
sections and `matchesBibSection` labels the site's, so every semantic must hold on both sides:
entry types are lower case and compared as written, `keywords` is comma-separated and
case-sensitive (Biber's rules, not a convenience), and each printed `\defbibfilter` is compiled as
its own predicate **minus every predicate declared above it** — including `printed: false` ones,
which claim the entry on the site — so first-match-wins holds in the PDF too. `record.test.ts`
evaluates the generated filter expressions against every entry in `content/publications.bib` and
fails if an entry lands in different sections on the two sides; a pair of matchers that merely
look alike is not evidence.

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
- `web/` reads `content/` at build time through `web/src/lib/record.ts` and
  `web/src/lib/cv.ts`. `cv.yaml` feeds four routes, not one: `/cv/`, the home page (`profile`,
  the feed), `/professional_activities/` (`service[]`) and `/projects/` (`projects[]`, funding
  figures included); `content/talks.bib` feeds `/talks/`. `record.ts` finds the root by walking
  up for `content/cv.yaml` rather than from `import.meta.url`, because Astro relocates the
  bundle during `astro build`. The Ledger design requires every displayed count and source line
  to be derived there rather than written by hand — see "Notable configuration" in
  `web/README.md`.
- The CV and the site share `content/publications.bib`. The site displays every entry,
  including under-review manuscripts and software artifacts; `web/README.md` owns that index's
  filtering and labelling contract. The bibliography uses both `First Last` and `Last, First`
  BibTeX name forms; reading the second as the first silently renames authors. `VENUE_FIELDS`
  reads `journaltitle` as well as `journal`: that is what a Better BibTeX BibLaTeX export writes.
- DBLP's `@misc` artifacts carry an unfilled `note = {Accessed on YYYY-MM-DD.}`. Both sides drop
  it now: `VENUE_FIELDS` tries `publisher` before `note`, and `cv.tex`'s `\DeclareSourcemap` nulls
  a `note` matching that exact placeholder, so a declared `types: [misc]` section renders.
- `web/src/lib/cv.ts` reads `content/cv.yaml` through Vite's `?raw` import, not `node:fs`. Do
  **not** rewrite it as `readFileSync(new URL('../../../content/cv.yaml', import.meta.url))`:
  that builds and then fails at prerender with `ENOENT`, for the same relocation reason as the
  bullet above. `?raw` inlines the file at build time, so there is no path to resolve. Because
  of that, `cv.ts` cannot be imported by anything that also runs under plain `node`:
  the shape and the pure functions live in `web/src/lib/cv-schema.ts`, which `announcements.ts`
  and `consistency.ts` import while reading the file themselves through `record.ts`.
- **`content/media/` is staged into `web/public/media/`** by the `stage-media` npm script,
  which npm runs before `dev`, `build` and `preview`. Astro's `publicDir` can only be one
  directory and `web/public/` holds the fonts and the load-bearing `.nojekyll`. `.gitignore`
  covers the destination.
- `web/src/lib/legacy-urls.ts` is the one hand-written list on the site: the addresses the
  Jekyll site published that this one does not generate. It is a historical fact, not a record
  to derive from, and `docs/url-parity.md` explains every entry. Removing one turns a live URL
  into a silent 404.
- Text spliced into a generated announcement must go through that module's `md()` escaper: the
  bibliography really contains `OVERLAY@AI*IA 2019` and DOIs ending `…-7_26`, which would otherwise
  be read as markdown emphasis. `content/talks.bib` is LaTeX like `publications.bib` is, so its
  fields need `deLatex()` first.
- **The printed CV has a baseline gate, not a byte-identical generated file.**
  `data/cv-baseline/` holds the extracted text and the page count of the CV as published;
  `data/cv-baseline/README.md` gives the three commands. A change to `cv.yaml`, the generator or
  `cv.tex` must leave `pdftotext -layout cv/cv.pdf -` identical to `cv-baseline.txt` at 8 pages,
  or record the difference there with its reason. `pdftotext -layout` re-quantises a whole page,
  so a diff that looks like harmless horizontal shifts on unrelated lines is usually a moved page
  break.

## The consistency gate

`web/src/lib/consistency.ts` compares the repository's records against each other and
**fails `astro build`** (never `astro dev`) when two hand-typed records of one fact
contradict. Joins are by being the same entry — never by matching prose; the design proved
name matching fails in both directions on this repository's data. `web/README.md` owns the
contract. Two things to know before touching it:

- **The Frontiers pair is correct, not a bug.** Appointed Mar 2024, announced 2025-03-03.
  The gate fires on it and `content/cv.yaml` carries a declared `except:` for it. Do not "fix"
  either date; renew or re-argue the exception instead.
- **The gate names no section.** It walks every top-level list of `content/cv.yaml` and every
  entry carrying `announced`. That is the point: a gate that named `appointments` and `service`
  would keep reporting "0 contradictions" over a shrinking number of comparisons after a rename.
  Prove any change to it both ways — inject a contradiction, confirm the build refuses naming
  both sides; revert, confirm it passes.
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

**The wording is one table.** `TEMPLATES` at the top of `web/src/lib/announcements.ts` holds one
canonical sentence per kind and is the only place a sentence literal may live. Grammar: what it
was, then where; the kind stays on the mono apparatus line and is not repeated in the prose, and
the venue is the short name. A missing slot must drop its own separator. Zero CSS was added for
the feed and none should be. **A template is selected by what the record structurally is, never
by a display label** — `Submitted` is chosen from `underReview`, not from a section's `short` —
and `record.test.ts` refuses a declared `short` that collides with a template name.

**A manuscript under review does not announce without an explicit `announced:`.** Its `year` is
the year it is aimed at, not a date anything happened on; the year fallback put five of them
above every real item on the front page. Give one a submission date and it announces as
"submitted to {venue}". It is on `/publications/` either way — the bibliography is not filtered.
The rule keys on `Publication.underReview`, derived in `record.ts` from the entry's own
`underreview` keyword — never on the `short` name of the section it displays under, which is an
editable label an adopter may rename or translate.

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
  cutover, not migrated. `/projects/` now renders `content/cv.yaml`'s real `projects[]`.
- `archive:` is gone, and so are its two orphan strings (`service_notes`, the alternative GDPR
  sentence). A junk drawer in a file whose premise is "one place per fact" is the disease with a
  lid on it. `archive.leadership` is now the ordinary top-level section `leadership:`, which the
  site renders and `cv/cv.tex` does not print — that is the answer to "keep a section off the
  PDF but on the site".
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
| `content/cv.yaml`          | all CV facts - the single source of truth        |
| `content/publications.bib` | all publications, canonical for CV _and_ website |
| `content/talks.bib`        | talks and presentations                          |
| `cv/cv.tex`                | layout and styling only                          |

- `node scripts/build-cv-data.mjs` renders `content/cv.yaml` into
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
- A long `detail:` runs off the two-column entry line and silently truncates the dates
  (`2010 – 20`). It is one short line by contract; long text goes in `items:`. Documented in
  `content/README.md` rather than fixed, because making the line wrap changes the design.
- `content/publications.bib` may carry rendering fields (`abstract`,
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
