# eduardstan.github.io

The personal academic site of Ionel Eduard Stan — <https://eduardstan.github.io>.

It is an [Astro](https://astro.build) site living in [`web/`](web/README.md), built and
published from `master` by `.github/workflows/deploy.yml`.

## The idea

Every fact on the site is read from one record and rendered from it. Nothing is
transcribed, so nothing can drift:

| Record                     | Owns                                                      |
| -------------------------- | --------------------------------------------------------- |
| `cv/cv.yaml`               | every CV fact — appointments, teaching, service, projects |
| `_bibliography/papers.bib` | every publication, for the site and the printed CV alike  |
| `cv/pres.bib`              | talks and presentations                                   |
| `_pages/about.md`          | the biography and the affiliation lines                   |
| `_config.yml`              | name, email and the accounts linked in the footer         |
| `web/src/content/blog/`    | the posts                                                 |

Turn on **inspect sources** in the site's header and every block names the record it came
from. `web/src/lib/consistency.ts` fails the build when two records of one fact disagree.

The printed CV is generated from the same `cv/cv.yaml` (`node scripts/build-cv-data.mjs`,
then `latexmk -xelatex -cd cv/cv.tex`) and typeset at deploy, so `/cv/` can offer a
current PDF without a binary entering git history.

## Working on it

```bash
cd web
npm ci
npm run dev      # http://localhost:4321
npm run build    # runs the consistency gate; refuses to publish a contradiction
npm test         # the readers and the gate, against the repository's real records
```

`web/README.md` documents the routes, the design and the sharp edges. `CLAUDE.md` holds
the knowledge that should travel with the code.

## History

The site was a [Jekyll](https://jekyllrb.com/) site on the
[al-folio](https://github.com/alshedivat/al-folio) theme until the July 2026 cutover to
this rebuild. `LICENSE` keeps al-folio's MIT licence and its copyright notice.
`docs/url-parity.md` records what every URL the Jekyll site published does now.
