# Printed CV baseline — updated 2026-10-02

Refreshed from `fm/site-ship-facts`, based on `origin/master` at commit `256fd1c`.

## Why this exists

Every CV change so far was gated on `cv/generated/cv-data.tex` coming out **byte-identical**.
That gate **cannot survive the interface redesign**: reshaping `cv.yaml` necessarily changes the
generated intermediate file, so the old gate would fail by construction and would have to be
switched off — leaving the migration with no protection on the artifact the site owner cares most
about.

This is its replacement.

## The new gate

    bash scripts/check-cv-baseline.sh

The script compares `pdftotext -layout` output with `cv-baseline.txt` and the `pdfinfo` page
count with `cv-baseline-meta.txt`. **Identical extracted text and identical page count is the
gate.** Any difference must be explained, not accepted.

## Baseline facts

- Pages: 8
- Extracted text: 412 lines
- Text sha256 (first 16): dc1b2136e8e754dc
- `cv-baseline.pdf` is the exact PDF, kept for visual comparison.

## Known intended differences

- 2026-07-29: Removed the Google Scholar screenshot and its caption because the CV and site now
  carry the full publication record. The page break that followed the figure was also removed:
  without the figure it orphaned the Publications heading, while removing it keeps the heading
  with the first five entries and reduces the CV from 8 pages to 7.
- 2026-07-29: Added the Software & artifacts publication section because released software is a
  research output and belongs in the printed CV. Its entries print authors, title, the DROPS
  Artifacts venue, date, and one DOI. The CV generally suppresses `howpublished` whenever a URL or
  DOI exists, and suppresses `url` whenever a DOI exists. The resulting bibliography reflows from
  7 pages to 7 pages.
- 2026-08-20: Moved `stan_jair2026b` from Under review to Journal articles (peer-reviewed)
  after its 2026-08-19 acceptance at the Journal of Artificial Intelligence Research. The
  bibliography's announced-date sorting puts this entry at J1 and consequently renumbers the
  affected journal and under-review entries; no citation data for those entries changed.
- 2026-08-20: Added BibLaTeX's `pubstate = {inpress}` to `stan_jair2026b`. The CV now renders
  `In press.` after the year; its extra line reflows the extracted whitespace around the talk
  headings and the entry itself, but no other citation data changes.
- 2026-09-02: Updated the CV record with the 2026 Sensors, Array and Journal of Artificial Intelligence Research publications, a reviewer role, 2027 AAAI and ICLR service, a GNCS project, and a Huawei challenge award. The added records and their detail reflow the document from 7 pages to 8.
- 2026-10-02: Marked `stan_jair2026b` as published using JAIR's volume, DOI, URL and author metadata, removing `pubstate = {inpress}` and the `preprint` keyword; added the dated 2027 AAAI and ICLR invitations and AAMAS reviewer service; removed the TIME 2022 conference version retained as the 2024 journal article; and added the PhD thesis title. The removed duplicate renumbers subsequent conference citations; the publication, service and thesis updates reflow text. The document remains 8 pages.
