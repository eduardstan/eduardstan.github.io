# URL parity across the cutover

What every address the Jekyll site published does now that the Astro site under `web/` is
the published site. The inventory this is checked against enumerated the live site on
2026-07-27: 49 sitemap URLs plus four non-sitemap files.

Three dispositions, and nothing is left without one:

- **resolves** — the same address serves the same thing.
- **redirects** — the address still answers and sends the visitor somewhere honest.
- **dropped** — the address 404s, deliberately, for a reason recorded here.

A dropped URL is a decision. A URL that is neither listed nor deliberately dropped is the
failure this file exists to prevent.

The records these pages are built from moved into `content/` after the cutover (`cv/cv.yaml` →
`content/cv.yaml`, `_bibliography/papers.bib` → `content/publications.bib`, `cv/pres.bib` →
`content/talks.bib`, `_pages/about.md` → `content/cv.yaml`'s `profile.bio.long`,
`web/src/content/blog/` → `content/posts/`). No page address changed: the post ids keep their
year directory, which is why `content/posts/` has one. The two former `/img/` media addresses
are deliberately dropped and recorded under Assets.

## Core pages — all resolve

| URL                                        | Now                                                      |
| ------------------------------------------ | -------------------------------------------------------- |
| `/`                                        | resolves — home, from `content/cv.yaml`                  |
| `/publications/`                           | resolves — 44 entries from `content/publications.bib`    |
| `/cv/`                                     | resolves — from `content/cv.yaml`, with the printed PDF  |
| `/professional_activities/`                | resolves — from `content/cv.yaml`'s `service[]`          |
| `/news/`                                   | **redirects** to `/lately/`, the same generated register |
| `/blog/`                                   | resolves — the two posts                                 |
| `/404.html`                                | resolves — Astro emits `404.html`; Pages serves it       |
| `/robots.txt`                              | resolves — rewritten, points at `/sitemap-index.xml`     |
| `/blog/2024/xai2-manifesto/`               | resolves — same address as before                        |
| `/blog/2025/latex-mistakes-and-solutions/` | resolves — same address as before                        |

`/lately/` is where the feed the Jekyll site served at `/news/` now lives — the name it
carries on the front page — and `/news/` redirects to it, so nothing that linked the old
address breaks.

`/talks/`, `/projects/`, `/search/` and the `/publications/{year-asc,type,title}/` orderings
are new; they take nothing away.

## Feeds and the sitemap

| URL            | Now                                                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/feed.xml`    | **resolves** — `src/pages/feed.xml.ts` serves the same document as `/rss.xml`. A redirect would not have worked: feed readers do not follow meta refresh.               |
| `/sitemap.xml` | **dropped** — `@astrojs/sitemap` publishes `/sitemap-index.xml`, and the rewritten `robots.txt` points crawlers at it. Nothing but `robots.txt` linked the old address. |

## The 22 news permalinks — all redirect to `/lately/`

The Jekyll site gave each `_news/` file a page at `/news/<month>-<day>-<slug>/` — the year
lived in the directory and never reached the address. They were in the sitemap and are
therefore indexable and linkable, so none of them may 404.

They cannot resolve as pages: this site has no `_news/`. Every announcement is generated
from the fact it announces, and a fact does not carry the prose of its old stub. So each
of the 22 redirects to `/lately/`, the register that still contains its announcement. The list
is frozen in `web/src/lib/legacy-urls.ts`.

| #   | Redirected address                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | `/news/06-10-pc-aaai2025/`                                                                                         |
| 2   | `/news/07-16-new-position-unimib/`                                                                                 |
| 3   | `/news/07-22-paper-modalfp-growth-efficient-extraction-of-modal-association-rules-from-non-tabular-data-accepted/` |
| 4   | `/news/07-22-paper-symbolic-audio-classification-via-modal-decision-tree-learning-accepted/`                       |
| 5   | `/news/08-02-post-xai2-manifesto/`                                                                                 |
| 6   | `/news/08-07-paper-ic2024-online/`                                                                                 |
| 7   | `/news/08-21-reviewer-jbhi/`                                                                                       |
| 8   | `/news/08-26-reviewer-iclr2025/`                                                                                   |
| 9   | `/news/10-22-paper-time2024-online/`                                                                               |
| 10  | `/news/01-11-ac-ijcnn2025/`                                                                                        |
| 11  | `/news/01-13-pc-ijcai2025/`                                                                                        |
| 12  | `/news/01-13-reviewer-eaai/`                                                                                       |
| 13  | `/news/02-18-paper-authenticated-robotic-teleoperation-with-task-recognition-accepted/`                            |
| 14  | `/news/03-03-associate-editor-frontiers-in-ai/`                                                                    |
| 15  | `/news/04-01-technical-committee-mda-ctsoc/`                                                                       |
| 16  | `/news/04-22-pc-ecai2025/`                                                                                         |
| 17  | `/news/07-18-pc-aaai2026/`                                                                                         |
| 18  | `/news/08-06-paper-telemonitoring-and-wearables-accepted/`                                                         |
| 19  | `/news/09-09-ac-icassp2026/`                                                                                       |
| 20  | `/news/09-23-pc-iclr-2026/`                                                                                        |
| 21  | `/news/10-26-associate-editor-neurcomputing/`                                                                      |
| 22  | `/news/12-10-pc-ijcai2026/`                                                                                        |

Item 18 announced a telemonitoring paper but carried item 13's date and body — the live
site rendered the same sentence twice. Redirecting it loses nothing that was true.

## Blog archives — redirect to `/blog/`

`jekyll-archives` generated a page per year, tag and category, and every post row on
`/blog/` linked to them. With two posts, one listing is the whole archive.

| URL                       | Now                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/blog/2024/`             | redirects to `/blog/`                                                                                                                        |
| `/blog/2025/`             | redirects to `/blog/`                                                                                                                        |
| `/blog/tag/xai/`          | redirects to `/blog/`                                                                                                                        |
| `/blog/tag/tutorial/`     | redirects to `/blog/`                                                                                                                        |
| `/blog/category/reviews/` | redirects to `/blog/`                                                                                                                        |
| `/blog/category/`         | **dropped** — a junk route with an empty `<title>`, produced by an empty `category:` in the LaTeX post's front matter. Nothing linked to it. |
| `/blog/page/2/`           | not applicable — 404 before the cutover too (2 posts, 5 per page)                                                                            |

## Template pages — dropped, as already decided

| URL                                    | Why                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `/people/`                             | two Albert Einstein template cards, "555 your office number"                   |
| `/projects/1_project/` … `/9_project/` | nine al-folio demo stubs; one redirected to unsplash.com                       |
| `/repositories/`                       | listed `torvalds`, `alshedivat`, `jekyll/jekyll` — someone else's repositories |
| `/_pages/dropdown/`                    | in the old sitemap but already a 404 on the live site                          |

`/projects/` itself is **not** dropped: it resolves, now rendering `content/cv.yaml`'s
`projects[]` — the captain's real funded projects.

## Assets

| URL                                                                                                                                                                                                      | Now                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/assets/pdf/publications/**` (7 PDFs)                                                                                                                                                                   | **resolve** — moved to `web/public/assets/pdf/publications/`, same addresses. They are the captain's own papers and nothing regenerates them.                                             |
| `/assets/img/eduard.jpg` (+ webp sizes)                                                                                                                                                                  | **dropped** — the same portrait is served at `/media/portrait.jpg`                                                                                                                        |
| `/assets/img/xai2-manifesto.png`                                                                                                                                                                         | **dropped** — the post's image moved with the post, to `/media/xai2-manifesto.png`                                                                                                        |
| `/img/portrait.jpg`                                                                                                                                                                                      | **dropped** — adopter-owned media moved into `content/media/` and is served at `/media/portrait.jpg`; only this site's pages referenced the old address, and they now use `/media/`       |
| `/img/xai2-manifesto.png`                                                                                                                                                                                | **dropped** — adopter-owned media moved into `content/media/` and is served at `/media/xai2-manifesto.png`; only this site's pages referenced the old address, and they now use `/media/` |
| `/favicon.svg`                                                                                                                                                                                           | **dropped** — the adopter-owned favicon moved into `content/media/` and is served at `/media/favicon.svg`; this site's icon link now uses that address                                    |
| `/assets/pdf/example_pdf.pdf`                                                                                                                                                                            | **dropped** — al-folio's demo PDF, which the old `/cv/` offered as a download. `/cv/` now offers the real CV.                                                                             |
| `/requirements.txt`                                                                                                                                                                                      | **dropped** — a build file that leaked into the published site                                                                                                                            |
| `/assets/{plotly,video,audio,jupyter,html,bibliography}/**`, `/assets/img/{1..12}.jpg`, `/assets/img/prof_pic*.{jpg,png}`, `/assets/img/publication_preview/*.gif`, `/assets/{css,js,fonts,webfonts}/**` | **dropped** — theme assets and demo content, referenced only by the template pages and drafts that went with them                                                                         |

## How to re-check this

The redirects are generated, so they can be verified rather than trusted:

```bash
cd web && npm run build
ls dist/news/            # 22 redirect pages plus index.html, all pointing at /lately/
ls dist/blog/            # 5 redirect pages plus index.html and the posts
ls dist/.nojekyll dist/robots.txt dist/feed.xml
```

`.nojekyll` is not cosmetic. GitHub Pages serves this repository with `build_type:
legacy`, which runs its own Jekyll pass over the deployed branch and strips
`_`-prefixed directories — including Astro's `_astro/`. Without that file the site
publishes with no CSS and no JavaScript.
