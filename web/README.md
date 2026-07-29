# web/ — Astro rebuild

The from-scratch rebuild of <https://eduardstan.github.io>, kept in a self-contained
directory so it can grow incrementally without touching the published site.

**The live site is still the Jekyll/al-folio tree in the repository root.** It is built
from `master` by `.github/workflows/deploy.yml` and published to the `gh-pages` branch.
Nothing here is deployed. Jekyll ignores this directory via the `exclude` list in
`_config.yml`, and `.github/workflows/web-ci.yml` only validates the rebuild — it has
`permissions: contents: read` and no deploy step. Cutover is a separate, explicitly approved
change.

That `exclude` list also carries a `cv/` entry, which is a publication guard and not dead
configuration — see "Two sites live in this repo" in the repository root's `AGENTS.md`.

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
npm test        # run the build-time data-reader self-checks
```

Site search is powered by [Pagefind](https://pagefind.app/), which indexes `dist/`
_after_ `astro build`. It therefore works under `npm run preview` but not under
`npm run dev`, where `/pagefind/*` does not exist yet.

## Layout

| Path                           | Purpose                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `src/content.config.ts`        | Typed schemas for the `blog` and `projects` collections        |
| `src/content/`                 | Sample blog and project entries for later content migration    |
| `src/layouts/BaseLayout.astro` | Shared document shell, with a named `head` slot                |
| `src/components/`              | Header, footer, page and section heads, source record, theme   |
| `src/lib/announcements.ts`     | Announcement feed generated from the facts it announces        |
| `src/lib/content.ts`           | Shared post query (draft rule + sort order) and date formatter |
| `src/lib/record.ts`            | Build-time readers for the repository's own data files         |
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
  count is whatever `_bibliography/papers.bib` holds, never a number written here. The
  column headings are links between them, so ordering the index needs no JavaScript and
  every order has a URL; only the default order is indexed by Pagefind (the others pass
  `noindex` to `BaseLayout`, which drops `data-pagefind-body`), and each names
  `/publications/` as its canonical URL through the layout's `canonical` prop, so there
  is exactly one canonical tag per page. Searching is Pagefind at `/search/`, not a second search box.
  Every row is a `<details>`: opening it reveals the abstract, the record and the entry's
  own BibTeX. **Nothing in the bibliography is filtered out** — manuscripts under review
  and released software artifacts are entries like any other. Labels follow the entry types
  and keywords `cv/cv.tex` filters on (`type=online and keyword=underreview` is "Under
  review", `keyword=workshop` is "Workshop"); DBLP's `@misc` artifacts are labelled
  "Software" explicitly because the CV does not print that type. The shared bibliography is
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
  `html` and `pdf` follow al-folio's own rule for them (`_layouts/bib.liquid`) — an address
  containing `://` is used as it stands, anything else names a file under `/assets/`. An
  entry with none of the four renders no link rather than a dead one. The link is a sibling
  of the `<summary>`, visually placed beside it: interactive content is not nested inside
  the summary, so the full row remains a dependable open/close control. URLs and DOIs go
  through `deLatexUrl`, **not** `deLatex`: the prose reader rewrites `--` as an en dash, and
  `paper\_29.pdf` is a real filename in this bibliography.
- **Abstracts are per-entry and unconditional.** The reveal renders `entry.abstract` when
  the entry has one and says so when it does not, so adding an `abstract` field to a BibTeX
  entry is the only action needed for it to appear. There is no flag and no list to update.
- **The CV page.** `/cv/` renders `cv/cv.yaml` — the same file `scripts/build-cv-data.mjs`
  turns into the printed CV — through `src/lib/cv.ts`, which reads it with Vite's `?raw`
  import (see the sharp-edge note in the repository's `AGENTS.md`: `import.meta.url` fails
  at prerender) and `src/lib/inline.ts`, which renders that file's portable prose grammar
  (`**bold**`, `_italic_`, `[text](url)`) with the regex from `build-cv-data.mjs`, so both
  renderers agree on the two rules that matter — an intra-word underscore is literal and a
  bare `*` passes through, keeping "CORE Rank: A\*" intact. `data_protection` and
  `archive.data_protection_optional_sentence` are deliberately not rendered: a GDPR consent
  written for a selection procedure means nothing on a public page. `service[]` and
  `projects[]` belong to their own pages. Because the Astro build reads `cv/`,
  `_bibliography/` and `_posts/`, `.github/workflows/web-ci.yml` triggers on those paths too.
- **Announcements belong to their facts.** `src/lib/announcements.ts` generates the home-page
  and `/news/` feeds from `cv/cv.yaml`, `_bibliography/papers.bib`, `cv/pres.bib` and `_posts/`.
  A fact is announced on its own date; `announced:` is added only when the historical
  announcement happened on a date the fact does not otherwise state. Dates render at the
  precision recorded by the source and no finer, while facts with no defensible date stay in
  the feed's `undated` provenance instead of receiving a guess. `_news/` remains only for the
  live Jekyll news page and is deleted at cutover; nothing in `web/` reads it.
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
  repository's bibliography, posts, talks, page sources and configuration, while
  `src/lib/cv.ts` reads `cv/cv.yaml`; `SOURCES` is their shared registry. Do not hand-write a
  number the page displays — the site's whole argument is that its claims can be checked.
  That includes what a page says it leaves out: `/cv/` derives its omission list from the
  file's own keys minus the ones it renders. `src/lib/record.test.ts` and
  `src/lib/cv.test.ts` (`npm test`, or
  `node --experimental-strip-types src/lib/<name>.test.ts` for one of them) assert the readers
  still agree with the data; `web-ci.yml` runs them before the build, which is what makes the
  widened `cv/**`, `_bibliography/**` and `_posts/**` triggers useful.

## Not done yet

Content migration and deployment. The home page, `/publications/`, `/news/` and `/cv/`
render the real data — the home page and `/news/` share the generated announcement feed, so
they cannot disagree; the `/professional_activities/` and `/repositories/` routes are
structural placeholders under the Ledger page furniture, and the blog and projects routes
are wired to their collections but still render the sample entries. `/cv/` does not yet
offer the PDF: publishing it belongs to the cutover.
