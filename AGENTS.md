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

That same `exclude:` list carries a `cv/` entry. No such directory exists on this branch yet — the
exclusion is deliberately in place _ahead_ of the task that creates it, because `cv/` will hold CV
sources and generated output that must never be published. **Do not delete it as dead
configuration**: removing it is what would publish that material once the directory lands.

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

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
