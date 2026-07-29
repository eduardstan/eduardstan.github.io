# web/ — the site

<https://eduardstan.github.io>. `.github/workflows/deploy.yml` builds this directory on every
push to `master` and publishes `dist/` to the `gh-pages` branch, which GitHub Pages serves.
That workflow is also the CI: a pull request runs the type-check, the self-checks and the
build, and skips only the publish step.

It replaced a Jekyll/al-folio site in the repository root at the July 2026 cutover.
`docs/url-parity.md` records what every URL that site published does now.

**Every adopter-owned record and media asset lives in
[`content/`](../content/README.md)** — `cv.yaml`, `publications.bib`, `talks.bib`, `posts/`,
`media/`. `src/lib/record.ts`'s `SOURCES` is the whole list of records the site reads, every
entry of it is under `content/`, and `record.test.ts` fails if one ever is not. The authored
research strands are the one copy exception; `content/README.md` explains what an adopter must
do with them.

**`public/.nojekyll` is load-bearing.** Pages serves this repository with `build_type: legacy`,
so it runs its own Jekyll pass over `gh-pages` and strips `_`-prefixed directories — including
`_astro/`. Without that file the site publishes with no CSS and no JavaScript. `deploy.yml`
asserts it reached `dist/` before publishing.

## Requirements

Node.js >= 22.12.0 (required by Astro 7).

## Develop, build, preview

```bash
cd web
npm ci          # install pinned dependencies

npm run dev     # dev server on http://localhost:4321
npm run build   # astro build, then pagefind indexes dist/
npm run preview # serve the built dist/ locally
npm run check   # astro check (TypeScript + Astro diagnostics)
npm test        # run the build-time data and consistency self-checks
```

Site search is powered by [Pagefind](https://pagefind.app/), which indexes `dist/`
_after_ `astro build`. It therefore works under `npm run preview` but not under
`npm run dev`, where `/pagefind/*` does not exist yet.

## Layout

| Path                           | Purpose                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `src/content.config.ts`        | Typed schema for the `blog` collection — the only one          |
| `../content/posts/<year>/`     | The posts. The year directory is part of the published URL     |
| `src/layouts/BaseLayout.astro` | Shared document shell, with a named `head` slot                |
| `src/components/`              | Header, footer, page and section heads, source record, theme   |
| `src/lib/announcements.ts`     | Announcement feed generated from the facts it announces        |
| `src/lib/content.ts`           | Shared post query (draft rule + sort order) and date formatter |
| `src/lib/record.ts`            | Build-time readers for `content/`; `SOURCES` is the registry   |
| `src/lib/cv-schema.ts`         | The shape of `content/cv.yaml` and the pure functions over it  |
| `src/components/Entries.astro` | One section of the CV as rows — there is one entry shape       |
| `src/lib/strands.ts`           | The three research strands — the one piece of authored copy    |
| `public/fonts/`                | Self-hosted subset faces, with `LICENSES.md`                   |
| `src/pages/`                   | Routes, including `rss.xml.ts`                                 |
| `src/styles/global.css`        | Tailwind entry point, theme tokens and minimal prose styles    |

## Notable configuration

- **Markdown processor.** Astro 7 renders Markdown with Sätteri by default, whose plugin
  API is not remark/rehype compatible. Because the existing posts use `$…$` / `$$…$$`
  math, `astro.config.mjs` opts back into the unified processor
  (`unified()` from `@astrojs/markdown-remark`) with `remark-math` + `rehype-katex`.
  `@astrojs/mdx` inherits `markdown.processor`, so `.mdx` gets the same pipeline.
- **Syntax highlighting.** Shiki with dual `github-light` / `github-dark` themes and
  `defaultColor: false`, so tokens carry both palettes as CSS variables and switch with
  the theme without re-rendering.
- **Dark mode.** `data-theme="dark"` on `<html>`, declared to Tailwind 4 with
  `@custom-variant dark` in `src/styles/global.css`. An inline script in `<head>` applies
  the stored choice before first paint; with nothing stored, `prefers-color-scheme` wins.
  The header toggle writes `localStorage.theme`.
- **Tailwind 4** is wired through the `@tailwindcss/vite` plugin (there is no
  `tailwind.config.js`; theme tokens live in `@theme` inside `global.css`).
- **Install scripts.** npm >= 11 blocks dependency install scripts until they are approved,
  and records the approval as the `allowScripts` field in `package.json`. The single entry
  there was written by `npm approve-scripts esbuild`. Do not delete it: without it, esbuild's
  postinstall is skipped on a fresh `npm ci`, leaving no platform binary and breaking the
  build. Run `npm approve-scripts --allow-scripts-pending` to see anything awaiting review.
- **Formatting.** `web/.prettierrc` scopes Prettier settings to this directory so the
  repository-wide `prettier . --check` in `.github/workflows/prettier.yml` stays green.
  It deliberately declares no plugins, because that root check runs without this
  directory's dependencies installed.

- **Design — Ledger.** A broadsheet: masthead, dateline, three columns, hairline rules,
  monochrome plus one signal blue reserved for machine-readable things. Three faces, three
  roles: Archivo Black (display), Inter (text), Go Mono (apparatus, and the visual marker
  that something is data rather than prose). All subset and self-hosted from `public/fonts/`;
  no CDN and no network font request.
- **The inspect switch.** One native checkbox in `BaseLayout.astro`, one general-sibling CSS
  rule per reveal, no JavaScript. It must stay a preceding sibling of `.wrap`, because every
  reveal is a `#inspect:checked ~ .wrap` rule in `global.css`. The source records are already
  in the HTML at `display: none`, so switching it on costs no request.
- **The publications index.** `/publications/` plus three sibling routes — `year-asc/`,
  `type/`, `title/` — are the whole bibliography in four orders, pre-rendered; the row
  count is whatever `content/publications.bib` holds, never a number written here. The
  column headings are links between them, so ordering the index needs no JavaScript and
  every order has a URL; only the default order is indexed by Pagefind (the others pass
  `noindex` to `BaseLayout`, which drops `data-pagefind-body`), and each names
  `/publications/` as its canonical URL through the layout's `canonical` prop, so there
  is exactly one canonical tag per page. Searching is Pagefind at `/search/`, not a second search box.
  Every row is a `<details>`: opening it reveals the abstract, the record and the entry's
  own BibTeX. **Nothing in the bibliography is filtered out** — manuscripts under review
  and released software artifacts are entries like any other. **The Type column and the "by
  type" order are read from `publications:` in `content/cv.yaml`**, the same declaration
  `scripts/build-cv-data.mjs` translates into the printed CV's biblatex filters and headings:
  a section is a title plus a filter over entry types and keywords, `record.ts` contains no
  parallel type taxonomy, and an entry matching no declared section is still shown, labelled
  "Other". A section may carry `printed: false` to be named here without printing in the PDF — how DBLP's
  `@misc` artifacts are labelled "Software" while the CV has no section for them.
  `VENUE_FIELDS` reads
  `journaltitle` as well as `journal`, because that is what a Better BibTeX **BibLaTeX**
  export writes — the export an adopter picks for a biblatex CV. The shared bibliography is
  the record; the site mirrors it.
- **The collapsed row carries a citation, not just a venue.** `citationOf()` in
  `src/lib/record.ts` assembles venue, series, volume, number, pages and publisher from
  whatever fields the entry has. It is deliberately **not** a citation style — no CSL, no
  per-type template: the volume attaches to the series where there is one and to the venue
  where there is not, which is the whole of the difference between how an `@article` and an
  `@inproceedings` read, and the rest is a `join` over the parts that are non-empty. Every
  field in this bibliography is optional in practice, so parts are dropped **before** the
  join; that is what keeps a sparse entry from printing a dangling comma. Do not grow this
  into a formatter — extend the field list and the tests instead.
- **Links prefer the DOI.** `linkOf()` orders `doi` → `html` → `url` → `pdf`: the DOI
  outlives a publisher's URL scheme, and DBLP's `url` is usually that same doi.org address.
  `html` and `pdf` retain the former al-folio `_layouts/bib.liquid` rule — an address
  containing `://` is used as it stands, anything else names a file under `/assets/`. An
  entry with none of the four renders no link rather than a dead one. The link is a sibling
  of the `<summary>`, visually placed beside it: interactive content is not nested inside
  the summary, so the full row remains a dependable open/close control. URLs and DOIs go
  through `deLatexUrl`, **not** `deLatex`: the prose reader rewrites `--` as an en dash, and
  `paper\_29.pdf` is a real filename in this bibliography.
- **Abstracts are per-entry and unconditional.** The reveal renders `entry.abstract` when
  the entry has one and says so when it does not, so adding an `abstract` field to a BibTeX
  entry is the only action needed for it to appear. There is no flag and no list to update.
- **One entry shape.** `content/cv.yaml` has exactly one: `title` (the only required field),
  then `org`, `place`, `dates`, `detail`, `url`, `items`, `announced`, plus the optional
  extras `metric`, `rank_url`, `years`, `funding`, `count` and `rows`. An appointment, a
  degree, a teaching post, a service role, a project, an award, a supervision row and a
  leadership role are all that shape, so `Entries.astro` renders any of them and the
  generator builds every entry's second line with one rule — `org, detail, editions`. Six
  interfaces and three LaTeX macros collapsed into that. **A top-level list is a section by
  construction**: the generator names none of them, so `fieldwork:` gets `\cvFieldwork` and
  friends for free, and `cv.tex` chooses which to print with one `\cvpart` line each.
- **The CV-fed pages.** `/cv/`, `/professional_activities/`, `/projects/` and the home page's
  service column all read `content/cv.yaml`, so the CV, the service list and the funded
  projects have one source between them. `groupByTitle()` in `src/lib/cv-schema.ts` groups
  `service[]` by its own `title` field, in the order those roles first appear in the file, and
  **both** the home page and `/professional_activities/` call it — they render the same list
  through the same grouping and cannot disagree. Each row hangs a rank badge off `metric`,
  linked to the `rank_url` beside it. The home page's "editorial boards" figure is
  `isEditorial()`, a `/\beditor\b/i` match on the title field, so a new editorship counts
  itself. `/projects/` renders `projects[]` **including the `funding` figures** — that file's own
  comment says the amounts are kept out of the printed CV so the website can use them, and
  no total is summed from them, because a programme total and a grant to one group are not
  the same quantity. There is no site-side filtering on any of the three.
- **`/talks/`** reads `content/talks.bib` through `talks()` in `src/lib/record.ts`, with the same
  BibTeX parser as the bibliography. Each row keeps the entry's own words: `note` is the
  sub-line ("Invited talk", "Oral presentation") and `keywords` is the badge. Nothing is
  filtered and nothing is relabelled, the same contract as `/publications/`.
- **There is no `/repositories/` route.** The Jekyll site's version listed `torvalds` and
  `jekyll/jekyll` — template content. A page of someone else's repositories is worse than no
  page, so the route was dropped rather than filled in; the GitHub link in the footer is the
  real one. `docs/url-parity.md` records the drop.
- **The CV page.** `/cv/` renders `content/cv.yaml` — the same file
  `scripts/build-cv-data.mjs` turns into the printed CV — through `src/lib/cv.ts`, which reads
  it with Vite's `?raw` import (see the sharp-edge note in the repository's `AGENTS.md`:
  `import.meta.url` fails at prerender) and `src/lib/inline.ts`, which renders that file's
  portable prose grammar (`**bold**`, `_italic_`, `[text](url)`) with the regex from
  `build-cv-data.mjs`, so both renderers agree on the two rules that matter — an intra-word
  underscore is literal and a bare `*` passes through, keeping "CORE Rank: A\*" intact.
  `profile.footer` is deliberately not rendered: a GDPR consent written for a selection
  procedure means nothing on a public page. `service[]` and `projects[]` belong to their own
  pages, and the page derives the list of sections it omits from the file's own top-level
  sections minus the ones it renders.
- **Announcements belong to their facts.** `src/lib/announcements.ts` generates the home-page
  and `/lately/` feeds from the four files under `content/`. It names no CV section: it walks
  every top-level list, and the section key becomes the kind on the apparatus line
  (`appointments` → `Appointment`, an invented `fieldwork:` → `Fieldwork`), except that
  `isEditorial()` gives an editorship the word "Editorial".
  A fact is announced on its own date; `announced:` is added only when the historical
  announcement happened on a date the fact does not otherwise state. Dates render at the
  precision recorded by the source and no finer, while facts with no defensible date stay in
  the feed's `undated` provenance instead of receiving a guess. **A manuscript under review
  does not announce without one**: its `year` is the year it is aimed at, not a date anything
  happened on, and letting it fall back to 1 January put five of them above every real item on
  the front page. The Jekyll site's `_news/` directory is gone; its 22 permalinks, and the
  `/news/` index itself, redirect to `/lately/` through `src/lib/legacy-urls.ts`.
- **One canonical sentence per kind.** `TEMPLATES` at the top of `announcements.ts` is the
  whole wording of the feed, one line per kind, and it is the first thing a reuser will want
  to edit. The grammar is **what it was, then where**; the kind is not repeated in the prose
  because the mono line beside the date already carries it, and the venue is the short name
  (`IJCAI 2026`, from the acronym the CV puts in brackets). Each template returns the
  segments of one sentence and they are joined after the empty ones are dropped, so a fact
  missing a slot never prints a dangling comma. Zero CSS was added for any of it: the bodies
  are `<b>`, `<i>` and `<a>` inside `.feed p`, all already styled.
- **The register is the feed, filtered by CSS.** `/lately/` is the whole stream — the home
  page's "Lately" column shows the newest six of the same `announcements()` call and links
  here, so the two cannot disagree about what "everything" is. It is broken by year with a
  `.sec` year marker, every row carries the record it was generated from under the inspect
  switch (the BibTeX key, or the `cv.yaml` list and entry title), and the facts that carry no
  defensible date are counted and listed in the same place. Filtering by kind is one hidden
  radio per kind plus one generated general-sibling rule per kind — the inspect switch's trick,
  so it is keyboard-operable, needs no JavaScript and downloads nothing. The kinds are read off
  the stream, never listed by hand, and the rules are written on the page from them. `/rss.xml`
  serves the same stream, one item per announcement, each linking its `/lately/#anchor`.
- **The dense row.** `.rows` in `global.css` is the table primitive the CV-fed pages need:
  `.defs`' label-left/meta-right pattern with a middle column and the dates in Go Mono. It
  stacks below 760px the way `.entry` does, so nothing scrolls sideways on a phone. Reuse it
  rather than adding a second row system.
- **The one script.** 378 bytes inline on the publications page, which copies a BibTeX
  entry to the clipboard. The button ships with `hidden` set and is revealed only where
  `navigator.clipboard` exists, so nothing unusable is ever shown, and the entry is plain
  `<pre>` text that stays selectable with JavaScript off. Everything else on the site —
  the inspect switch included — runs without script.
- **Provenance is generated, never written.** Every count, source path, line range and
  "this is missing" note comes from the build-time readers. `src/lib/record.ts` reads the
  repository's bibliography, posts, talks and `profile:` block, while `src/lib/cv.ts` reads
  the sections of `content/cv.yaml`; `SOURCES` is their shared registry. Do not hand-write a
  number the page displays — the site's whole argument is that its claims can be checked.
  That includes what a page says it leaves out: `/cv/` derives its omission list from the
  file's own sections minus the ones it renders. `src/lib/record.test.ts` and
  `src/lib/cv.test.ts` (`npm test`, or
  `node --experimental-strip-types src/lib/<name>.test.ts` for one of them) assert the readers
  still agree with the data; `deploy.yml` runs them before the build. That workflow has no
  path filters, so no filter list has to be kept in step with `SOURCES`.
- **The consistency gate.** `src/lib/consistency.ts` compares the records that state one fact
  twice and refuses the build when they disagree. Today that is one check,
  `announced-in-own-year`: a fact carrying both its own date and an `announced:` date is the
  one duplicate the one-source architecture cannot remove, so it is the one thing left to
  check. It runs in an `astro:build:done` integration in `astro.config.mjs` — which runs on
  `astro build` and never on `astro dev`, so an author mid-edit is never blocked and nothing
  publishable ships a contradiction — renders under the inspect switch on the home page, and
  is asserted by `src/lib/consistency.test.ts`. Joins are by being the same entry, never by
  matching prose; a comparator that cannot read a value does not fire, and the gate prints its
  own coverage. A contradiction that is genuinely two correct facts is declared on a CV fact
  with `except:` (grammar at the top of `content/cv.yaml`) — one named check, a reason rendered
  to the reader, and either an ISO expiry or an explicit `permanent` marker that the build
  validates. **The gate names no section**: it walks every top-level list of the CV and every
  entry that carries `announced`, so a section rename cannot make it quietly compare fewer
  records while still reporting "0 contradictions".

- **Posts carry their own typography.** The Markdown pipeline runs no smartypants, so a
  migrated post writes an em dash as the character `—` rather than as `---` — the same rule
  `content/cv.yaml` states for its own prose. A `---` left in a paragraph prints as three hyphens.
  Watch the `$` too: KaTeX is applied globally, and the LaTeX post is full of dollar signs
  that are safe only because every one of them sits inside a code fence or a code span.
- **Wide prose scrolls inside itself.** The migrated XAI post carries nine three-column
  tables. `.prose table` in `global.css` is `display: block; overflow-x: auto`, so a table
  too wide for a phone scrolls in its own box instead of pushing the page sideways.

- **`content/media/` is staged into `public/`.** Astro's `publicDir` can only be one
  directory and `public/` already holds the fonts and the load-bearing `.nojekyll`, so the
  `stage-media` npm script copies `content/media/` to
  `public/media/` before `dev`, `build` and `preview` (npm runs it through the matching
  `pre*` scripts). `.gitignore` covers the destination: `content/` is the source.

## The printed CV

`/cv/` offers the PDF when the build has one. `deploy.yml` typesets `cv/cv.tex` and stages the
result at `public/assets/cv.pdf` before `astro build`; `.gitignore` covers that path, so the
binary never enters git history. A plain local build has no PDF and the page simply does not
offer one — `src/pages/cv.astro` checks rather than assumes.
