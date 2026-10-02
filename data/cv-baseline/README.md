# Printed CV baseline — updated 2026-10-02

Refreshed for the Software section and ModalDecisionTrees.jl record on `fm/site-ship-software`.

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
- Extracted text: 411 lines
- Text sha256 (first 16): dfbd0edc32a43787
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

- 2026-10-02: Renamed the printed and site publication group from Software & artifacts to Software and added the ModalDecisionTrees.jl software record (2023). The existing Sole.jl and ModalAssociationRules.jl entries remain unchanged. Software still has its own `S` numbering; the new citation adds S3 without changing the order or keys of other entries. The heading and citation reflow the bibliography's spacing; the document remains 8 pages.

- 2026-10-02: Updated the JBHI systematic-review record to IEEE's issue data (volume 30, issue 3, pages 2630–2645, 2026) after Crossref confirmed it. This replaces the online-first year and placeholder pagination; its `announced` date, if present, is unchanged. The document remains 8 pages.
- 2026-10-02: Added the JAIR article identifiers from the owner-provided final PDFs: Article 9 for volume 87 (`stan_jair2026b`) and Article 36 for volume 86 (`stan_jair2026`). The BibLaTeX-rendered public CV now includes `9` and `36` after the respective volumes.
- 2026-10-02: Corrected the author of `DBLP:journals/ai/Munoz-VelascoPS19` from `Mercedes Pelegrín-García` to `Mercedes Pelegrín`, as printed on owner PDF 03 and reported by Crossref for DOI `10.1016/j.artint.2018.09.001`. This also reflows that citation across two lines. The baseline was refreshed after review; the only changed hunks are the two JAIR identifiers and this author correction with its line-wrap consequence. The document remains 8 pages.
