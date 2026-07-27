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
hold CV sources and generated output that must never be published. Do not delete it as
dead configuration.

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

## Not done yet

Visual design, content migration, the bibliography renderer, the CV pipeline and
deployment. The pages under `src/pages/` are structural placeholders that prove routing.
