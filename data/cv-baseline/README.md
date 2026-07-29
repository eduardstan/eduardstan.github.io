# Printed CV baseline — captured 2026-07-29

Captured from `origin/master` at commit 78d915e, BEFORE the adopter-interface redesign.

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

- Pages: 7
- Extracted text: 399 lines
- Text sha256 (first 16): c0aef847aec9c40c
- `cv-baseline.pdf` is the exact PDF, kept for visual comparison.

## Known intended differences

- 2026-07-29: Removed the Google Scholar screenshot and its caption because the CV and site now
  carry the full publication record. The page break that followed the figure was also removed:
  without the figure it orphaned the Publications heading, while removing it keeps the heading
  with the first five entries and reduces the CV from 8 pages to 7.
- 2026-07-29: Added the Software & artifacts publication section because released software is a
  research output and belongs in the printed CV. Each entry now prints its publisher and DOI once;
  the CV layout generally suppresses `howpublished` and `url` when a DOI already supplies the same
  address. The shorter bibliography reflows within the existing 7 pages.
