# web/ — Astro rebuild

The from-scratch rebuild of <https://eduardstan.github.io>, kept in a self-contained
directory so it can grow incrementally without touching the published site.

**The live site is still the Jekyll/al-folio tree in the repository root.** It is built
from `master` by `.github/workflows/deploy.yml` and published to the `gh-pages` branch.
Nothing here is deployed. Jekyll ignores this directory via the `exclude` list in
`_config.yml`, and `.github/workflows/web-ci.yml` only builds and type-checks — it has
`permissions: contents: read` and no deploy step. Cutover is a separate, explicitly
approved change.

That `exclude` list also carries a `cv/` entry. No such directory exists on this branch
yet; the exclusion is in place _ahead_ of the task that creates it, because `cv/` will
hold CV sources and generated output that must never appear on the published site. Do
not delete it as dead configuration. It only stops publication, though — it does not
keep anything out of the git repository, so whatever under `cv/` must never be committed
is a plain `.gitignore` concern, separate from this exclude entry.

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
```

Site search is powered by [Pagefind](https://pagefind.app/), which indexes `dist/`
_after_ `astro build`. It therefore works under `npm run preview` but not under
`npm run dev`, where `/pagefind/*` does not exist yet.

## Layout

| Path                           | Purpose                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| `src/content.config.ts`        | Typed schemas for the `blog`, `news` and `projects` collections |
| `src/content/`                 | Sample entries only — real content is migrated in a later task  |
| `src/layouts/BaseLayout.astro` | Shared document shell, with a named `head` slot                 |
| `src/components/`              | Header, footer, theme script and toggle                         |
| `src/lib/content.ts`           | Shared post query (draft rule + sort order) and date formatter  |
| `src/lib/record.ts`            | Build-time readers for the repository's own data files          |
| `src/lib/strands.ts`           | The three research strands — the one piece of authored copy     |
| `public/fonts/`                | Self-hosted subset faces, with `LICENSES.md`                    |
| `src/pages/`                   | Routes, including `rss.xml.ts`                                  |
| `src/styles/global.css`        | Tailwind entry point, theme tokens and minimal prose styles     |

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
  and released software artifacts are entries like any other, labelled by the same entry
  types and keywords `cv/cv.tex` filters on (`type=online and keyword=underreview` is
  "Under review", `keyword=workshop` is "Workshop"). The CV bibliography is the record;
  the site mirrors it.
- **The one script.** 378 bytes inline on the publications page, which copies a BibTeX
  entry to the clipboard. The button ships with `hidden` set and is revealed only where
  `navigator.clipboard` exists, so nothing unusable is ever shown, and the entry is plain
  `<pre>` text that stays selectable with JavaScript off. Everything else on the site —
  the inspect switch included — runs without script.
- **Provenance is generated, never written.** Every count, source path, line range and
  "this is missing" note comes from `src/lib/record.ts`, which reads the repository's own
  files (`_bibliography/papers.bib`, `_news/`, `_pages/`, `_config.yml`) at build time. The
  bibliography gap is a set difference between the news feed and the bibliography, so it
  shrinks on its own as entries are added. Do not hand-write a number the page displays —
  the site's whole argument is that its claims can be checked. `src/lib/record.test.ts`
  (`node --experimental-strip-types src/lib/record.test.ts`) asserts the readers still agree
  with the data.

## Not done yet

Content migration, the CV pipeline and deployment. The home page and
`/publications/` render the real data; the `/cv/`, `/professional_activities/` and
`/repositories/` routes are structural placeholders under the Ledger page furniture,
and the blog, news and projects routes are wired to their collections but still
render the sample entries.
