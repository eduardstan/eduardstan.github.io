# `content/` — the adopter-owned records and media

This directory owns every structured record and media asset about you. The one authored-layout
exception an adopter must review is named below.

```
content/
  cv.yaml            you, and every section of your CV
  publications.bib   standard BibTeX
  talks.bib          standard BibTeX
  posts/             blog posts, Markdown with front matter
  media/             portrait, favicon and post images
```

Two consumers read it: the website (`web/`) and the printed CV (`cv/cv.tex`, via
`node scripts/build-cv-data.mjs`). Neither has a second copy of anything.

**The fastest way in:** copy the example below into `cv.yaml`, put an empty `publications.bib` and
`talks.bib` beside it, and run the two builds. You get a one-page CV and a working site. Then grow it
— starting with your own BibTeX export, which needs no conversion at all.

## The smallest file that works

```yaml
profile:
  name: Alex Newcomer
  site: https://alex-newcomer.example
  headline: Postdoctoral Researcher
  affiliation:
    - label: University of Somewhere
  place: Somewhere, Elsewhere
  email: alex@example.edu
  bio:
    short: Alex Newcomer is a postdoctoral researcher at the University of Somewhere.

appointments:
  - title: Postdoctoral Researcher
    org: University of Somewhere
    dates: 2025 – Present
```

## Bring the publications you already have

**Drop your BibTeX file in as `publications.bib`. That is the whole import.** It is the largest
block of an academic CV and it costs nothing: an untouched DBLP export for a stranger — 26 entries,
not one edit — renders complete on the site (authors, venue, pages, DOI link, copy-BibTeX block)
_and_ prints in the PDF, grouped and numbered. Zotero, Mendeley and Google Scholar write the same
format. `talks.bib` works the same way. Two things to know before you read the result:

**Declare your sections, or every entry is labelled `Other`.** Nothing about grouping is built in —
which type belongs under which heading is your opinion and you write it down
([how they are grouped](#how-they-are-grouped-publications-and-talks-in-cvyaml)). Paste this beside
the example above and refine it once you can see your own list:

```yaml
publications:
  sections:
    - { title: Journal articles (peer-reviewed), short: Journal, types: [article] }
    - { title: Conference papers (peer-reviewed), short: Conference, types: [inproceedings] }
    - { title: Books & chapters, short: Books, types: [incollection, inbook, book] }

talks:
  sections:
    - { title: Talks, short: Talk, types: [unpublished] }
```

(`inbook` is in there because Crossref emits it for conference papers published in LNCS. Without it
those land in `Other`. Declaring a section for a file you have not filled in yet costs nothing: a
`.bib` with no entries prints no bibliography at all.)

**DBLP escapes the underscores in `doi`, and the PDF prints the backslash.** It writes
`doi = {10.1007/978-3-319-07857-1\_33}`; the site strips the escape, the PDF prints it literally and
its DOI link carries `%5C_`. Until that is fixed for everyone, unescape them yourself:

```sh
sed -i '/doi *=/ s/\\_/_/g' content/publications.bib
```

It is a known blemish that the site owner's own published CV carries — not something you did wrong.

## `profile:`

```yaml
profile:
  name: Ada LOVELACE, Ph.D.     # exactly as printed at the top of the CV, and as
                                # the site's masthead. Surname capitalised and a
                                # degree appended are conventions, not rules —
                                # write your name the way you want it set.
  site: https://ada.example     # where THIS site is published. Canonical links,
                                # feeds and the sitemap all use this one origin.
  headline: Reader in Analytical Engines        # your role, alone. No institution.
  affiliation:                  # smallest unit first: group, then department,
    - label: Analytical Engine Group            # then institution. A list, so a
      url: https://example.ac.uk/aeg            # cross-appointment can be stated
    - label: University of Example              # without changing the shape.
      url: https://example.ac.uk/
  place: London, WC1E, United Kingdom           # city, postcode, country
  address:                      # street-level lines. The WEBSITE footer only —
    - 5 Example Street          # the printed CV never carries them. Omit it and
    - Room 12                   # the footer prints the affiliations and `place`.
  email: ada@example.ac.uk
  website:                      # a page about you that ISN'T this site — your
    label: ada.example.com      # staff page, your lab. Omit it if you have none.
    url: https://ada.example.com/
  links:                        # account IDs, not URLs. Known kinds: scholar,
    orcid: 0000-0002-1825-0097  # orcid, github, linkedin. Adding another needs
    github: adalovelace         # BOTH an entry in ACCOUNTS in
                                # scripts/build-cv-data.mjs and one in ACCOUNTS
                                # in web/src/lib/record.ts, plus a \cvicon<kind>
                                # macro in cv/preamble.tex, or write it as
                                # { label: ..., url: ... } and it needs neither.
  portrait: portrait.jpg        # a file in content/media/
  favicon: favicon.svg          # another file in content/media/. Optional: if it
                                # is omitted or missing, no icon link is emitted.
  bio:
    short: >-                   # THIRD person, one paragraph. Printed as the CV's
                                # "Short Bio". The site does not show it.
      Ada Lovelace is a Reader in ...
    long: >-                    # FIRST person, several paragraphs. The site's
                                # front page shows all of it, and quotes the first
                                # sentence above the fold. The CV does not print
                                # it. `>-` FOLDS: wrap at 80 columns freely and
                                # separate paragraphs with a blank line. (`|-`
                                # would keep every wrap as a hard line break.)
      I work on ...

      My group ...
  focus: >-                     # One paragraph, the CV's "Research Focus". This is
                                # the technical statement — subject, method,
                                # application. `bio.short` is the career summary;
                                # this is the work. If you find yourself writing
                                # the same sentence twice, omit this one: the
                                # heading disappears with it.
    Analytical engines, with an emphasis on ...
  footer: >-                    # printed small at the foot of the CV. Where a data
                                # protection or GDPR consent clause goes. Omit it
                                # and nothing is printed.
    **Data protection and permitted use.** I authorize the processing of ...
```

`name` is the only field the CV data shape requires. The website build also requires `site`,
because it cannot publish honest canonical, feed and sitemap URLs without knowing its origin.

The address block under your name on the CV is built as: `headline, affiliation[0]`, then each
further affiliation, with `place` appended to the last one. With one affiliation it is a single
line.

## A section

A section is a top-level key holding a list. (`publications:` and `talks:` hold `sections:`
instead of entries — they group the two BibTeX files and are documented further down.) Every field
except `title` is optional:

```yaml
appointments:
  - title: Reader in Analytical Engines   # what it was
    org: University of Example            # where it was
    place: London, United Kingdom         # the city
    dates: Mar 2024 – Present             # when. Any spelling you like, but use
                                          # the SAME one everywhere — nothing
                                          # normalises it and two spellings in
                                          # one CV show.
    detail: Analytical Engine Group       # ONE SHORT LINE more. It is printed
                                          # beside `org` on a line that does not
                                          # wrap: a long detail runs off the page
                                          # and silently truncates the dates to
                                          # something like "2010 – 20". Long text
                                          # belongs in `items:`.
    url: https://example.ac.uk/           # the site links `org` to this
    items:
      - Teaching, supervision and ...
    announced: 2024-03-18                 # optional; see "Announcements"
```

On the printed CV an entry is two lines: **title** with `dates` right-aligned, then `org, detail`
with `place` right-aligned.

`title` is the strong word on the line, so make it the thing worth reading. For a membership or a
subscription there is often no title; write the body in `title` and leave `org` out
— `title: Geoscience Society of New Zealand` reads better than `title: Member`.

A classification or grade is part of the title string: `M.Sc. in Earth Sciences (First Class
Honours)`, `Ph.D. in Mathematics (Excellent cum laude)`.

### Which sections exist

`content/cv.yaml` may hold **any** top-level list you like, and `cv/cv.tex` decides which of them
the PDF prints, in what order, under what heading — one line per section. Add a section to the
YAML and a `\cvpart{Your Heading}{YourKey}` line to `cv.tex` and it is printed. A section written
as a map (see [the section-level `note`](#entry-fields-some-sections-need) below) may carry
`printed: false`, which keeps it out of the PDF with its `\cvpart` line left in place; the website
renders it either way.

**The website is not open in the same way.** It renders exactly these keys:

| Key | Where it appears on the site |
| --- | --- |
| `appointments`, `education`, `teaching`, `supervision`, `awards`, `languages`, `leadership` | `/cv/` |
| `service` | `/professional_activities/` and the home page |
| `projects` | `/projects/` |

A section you invent — `fieldwork:`, `outreach:` — reaches the **printed CV** and the **register**
(where it announces as `Fieldwork`), and not a page of its own until a route is added for it. Use
the names above where they fit.

**A section you have none of: leave the key out**, or write `awards: []`. Both are the same: no
heading, no gap, nothing printed, no error.

### Entry fields some sections need

| Field | Means | Printed as |
| --- | --- | --- |
| `metric` | a ranking or impact figure | `**[IF: 6.5, Q1]**` after `org` |
| `rank_url` | where that figure is evidenced | the site links `metric` to it |
| `years` | editions of a recurring role | `2024–2026` after `org` |
| `funding` | grant or programme amount | website only, never the CV |
| `count` | how many | last on the entry's `org` line, unless the entry has `rows` — or a column, see below |
| `rows` | a table hanging under the entry | see below |

`count` folds into the entry's `org` line in a section the document prints with `\cvpart`. A
section set by hand as a table of its own prints it as a column instead: `supervision:` is that
section here, and `cv/supervision.tex` prints each entry's `title`, `count` and `detail` as the
**Level**, **#** and **Notes** columns without printing the entry lines at all.

`years` is a plain list. Only an edition that carries an announcement date grows into a map:

```yaml
years: [2024, { year: 2025, announced: 2024-06-10 }, 2026]
```

`rows:` turns an entry into a heading over a table. **Each row's keys, in the order you write
them, are the columns, and the key is printed verbatim as the heading.** Write `Points:` and the
column says "Points"; write `Programme / Level:` and it says that. No casing is derived, so write
each key exactly as it should print. Reordering two keys reorders two columns, silently — so write
them once and leave them alone. The column **widths** are layout: the generator emits equal-width
columns and `cv/cv.tex`'s `\cvcoursecols` hand-tunes them, so a table with a different number of
columns prints without a LaTeX edit and only its tuning lives there.

```yaml
teaching:
  - title: Lecturer
    org: University of Example
    dates: 2024 – Present
    rows:
      - Course: Databases
        Programme / Level: B.Sc. Computer Science
        Key topics: SQL; relational algebra
        Hours: 30 h/yr
```

Those four keys are fixed **in this repository**, even though the printed heading is whatever you
write: `/cv/` reads each course row's `Course`, `Programme / Level`, `Key topics` and `Hours` by
name, and its contact-hours totals read the leading number out of `Hours`. Rename one and the PDF
prints the new heading while the page renders that column blank and the totals fall to 0. A table
of your own, in a section of your own, is free-form.

A section-level `note` is not an entry field. A section that needs a paragraph of its own above
its entries is written as a map:

```yaml
supervision:
  note:
    - "**Total supervision:** ... "
    - "**Topic coverage:** ... "
  entries:
    - title: B.Sc. theses
      count: 10+
      detail: End-to-end supervision of ...
```

### Prose you may write in any field

`**bold**`, `_italic_`, `[text](url)`. Write typographic characters as the real character:
`—` `–` `€`. A bare `*` is literal, so `CORE Rank: A*` is safe.

Everything else is escaped for you, including `$`, `&`, `%` and `#` — `NZ$960,000` is safe.
The **one** exception is a URL: no address may contain `\ ~ _ ^ $ { }`, so percent-encode those
(`~` is `%7E`, `_` is `%5F`, `\` is `%5C`). The build refuses rather than emitting a wrong link.

The CV is set in Palatino, which has no macron, no Cyrillic and no CJK. A character it lacks is
**dropped silently** — `Te Apārangi` prints as `Te Aprangi`. Search the LaTeX log for
`Missing character` after your first build.

## `publications.bib` and `talks.bib`

Standard BibTeX. Export from Zotero, Mendeley, DBLP or Google Scholar and drop the file in.
Nothing is filtered: every entry is shown on the site, including manuscripts under review.
Both `journal` and BibLaTeX's `journaltitle` are read, so a Better BibTeX BibLaTeX export works.

### How they are grouped: `publications:` and `talks:` in `cv.yaml`

**A section is a title plus a filter, and you declare it.** No publication entry type is named in
`cv.tex` or in the website's source, so every BibTeX type is expressible — an adopter whose career
is books, datasets or patents declares a section and it works, with no LaTeX edit. The
`publications:` declaration is read by both, so the PDF and the publication index cannot disagree
about how the work is grouped.

```yaml
publications:
  sections:
    - title: Journal articles (peer-reviewed) # the heading in the PDF
      short: Journal # the site's Type column, and the "J=Journal" key
      types: [article] # entry types, ANY of which matches
    - title: Conference papers (peer-reviewed)
      short: Conference
      types: [inproceedings]
      exclude_keywords: [workshop] # keywords, NONE of which may be present
    - title: Workshop papers
      short: Workshop
      types: [inproceedings]
      keywords: [workshop] # keywords, ALL of which must be present
    - title: Books & chapters
      short: Books
      types: [incollection, book]
    - title: Software & artifacts
      short: Software
      types: [misc]
```

Declaration order is match order and, among printed sections, print order. Each publication lands
in the **first** section it matches, in the PDF exactly as on the site: each printed section's
biblatex filter is compiled as its own criteria *minus* every section declared above it, including
any carrying `printed: false`, so an entry two sections accept is printed once and labelled the
same way. Two more keys: `prefix:` overrides the numbering letter (it defaults to `short`'s first
letter, and two printed sections claiming the same one is an error, not a silent collision), and
`printed: false` omits a section from the PDF; a publication section remains named on the website
— the answer to "on the site, not in the CV", as `leadership:` is for ordinary sections. Every
section is checked, printed or not: one with no criteria at all would match the whole bibliography,
so it is refused rather than accepted quietly.

**Types and keywords are matched exactly as Biber matches them**, because Biber is the other
consumer: entry types are written in **lower case** (biber lower-cases every one before testing a
filter, so `types: [Article]` is refused rather than silently matching nothing), a `keywords`
field is a **comma-separated** list, and a keyword matches only as written. A semicolon-separated
`keywords` field — DBLP writes some — is therefore one long keyword to both consumers.

`short` is a display label and nothing reads it for meaning: rename it, translate it, and the
site and the PDF follow. In particular both halves of the under-review rule — keeping an
unannounced manuscript out of the register, and wording an announced one "submitted to {venue}" —
read the entry's own `underreview` keyword, not the name of the section it lands in.

An accepted manuscript that has not appeared yet carries BibLaTeX's standard
`pubstate = {inpress}` field. The printed CV's numeric style renders this as `In press.` and the
website renders `Accepted / in press (not yet published)` beside the citation. This is separate
from `underreview`: an in-press entry stays in its ordinary type section, and `preprint` is only a
keyword for a manuscript version — it is not the publication-status flag.

**A section whose filter matches nothing prints nothing at all** — no heading, no gap — so
declaring one costs nothing until the first entry arrives. An entry matching no section is still
shown on the site, labelled `Other`; that is the visible sign that you have no group for it yet.

`talks:` takes the same shape over `talks.bib` and controls the PDF's talk headings, filters,
numbering prefixes and key. The `/talks/` page deliberately does not relabel talks from this
declaration: its badges and descriptions remain each entry's own `keywords` and `note`, so
`printed: false` on a talk section only omits that section from the PDF.

`talks.bib` entries look like this — the entry type and every field name matters:

```bibtex
@unpublished{talk_agu_2024,
  author     = {Lovelace, Ada},
  title      = {What the engine cannot do},
  note       = {Invited talk},          % also the label in the register, and its filter
  eventtitle = {AGU Fall Meeting},
  venue      = {Washington, D.C., United States},
  date       = {2024-12-11},            % ISO 8601, required
  keywords   = {invited}                % invited | oral | poster
}
```

## `posts/`

Markdown, one file per post, in `content/posts/`. A post's address is `/blog/<path>/`, so
`posts/2024/what-i-learned.md` is published at `/blog/2024/what-i-learned/` — the directories are
part of the URL. Front matter:

```yaml
---
title: What I learned
description: One sentence.
date: 2025-06-11
draft: false
---
```

## `media/`

Images. `profile.portrait` and the optional `profile.favicon` name files here by bare filename;
**inside a post or an item, refer to one as `/media/<file>`** — the directory is published at
that address.

## Announcements

The website's register of announcements, at `/lately/`, is generated. **You never write a news
item.**

A fact announces itself on a date it already carries: a talk's `date`, a post's `date`, an award's
month, a paper's `year`. An **entry of `cv.yaml` announces when it gives a month
(`dates: Nov 2021`) or an explicit `announced:`** — a `dates:` range is not an announcement.

```yaml
announced: 2024-06-10
```

Add it only where the announcement genuinely happened on a date the entry does not otherwise state.
It is optional everywhere. A fact with nothing to date it is not guessed at: it is listed, with the
reason, in the feed's provenance block. A **manuscript under review** is the case that matters: its
`year` is the year it is aimed at, not a year anything happened in, so it does not announce until
you give it an `announced:` — the day you submitted it. It stays on `/publications/` either way.

The sentence each kind of fact is announced in is one table, `TEMPLATES`, at the top of
`web/src/lib/announcements.ts`. It is the first thing to edit if you want different wording.

## One thing `content/` does not yet own

Everything about *you* is in this directory. One piece of prose on the site is not:

- **`web/src/lib/strands.ts`** — the three research strands on the front page. No file in
  this repository states a strand structure, so this is authored copy rather than a derived
  record, and it is kept alone in one module so that stays obvious. **If you adopt this site,
  rewrite it or delete the block from `web/src/pages/index.astro`** — until you do, the front
  page describes someone else's research.

## Prove a clean handoff

Make the replacement in a clean throwaway checkout of the repository, never in the copy you are
preparing to publish and never in a filesystem copy carrying ignored build outputs. Replace
`content/` with the smallest example above, empty `publications.bib` and `talks.bib`, and your own
portrait and favicon, then run `cd web && npm run build`.

Search the rendered documents in `web/dist/` in both directions: your new name and site domain
must appear, while the previous owner's name and domain must not. For example:

```sh
grep -RInF --include='*.html' --include='*.xml' --include='*.json' --include='*.txt' \
  'Alex Newcomer' web/dist
grep -RInF --include='*.html' --include='*.xml' --include='*.json' --include='*.txt' \
  'alex-newcomer.example' web/dist
grep -RInF --include='*.html' --include='*.xml' --include='*.json' --include='*.txt' \
  'Previous Owner' web/dist
grep -RInF --include='*.html' --include='*.xml' --include='*.json' --include='*.txt' \
  'previous-owner.example' web/dist
```

The first two commands must print matches. The last two must print nothing and exit with status 1.
CI runs the same cold-start proof with a synthetic adopter on every push and pull request.

## The two builds

```bash
node scripts/build-cv-data.mjs   # content/cv.yaml -> cv/generated/cv-data.tex
latexmk -xelatex -cd cv/cv.tex   # the PDF. xelatex, not pdflatex
cd web && npm run dev            # the site
```

`web` refuses to build when two records in `content/` contradict each other; it tells you which
two and where. `astro dev` never refuses, so you are not blocked mid-edit.
