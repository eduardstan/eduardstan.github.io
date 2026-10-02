# Application dossier generator

`content/dossier.yaml` is the only dossier-specific selection. The generator reads the same
`content/cv.yaml`, `content/publications.bib`, `content/talks.bib` and generated CV macros as the
site and printed CV. It creates temporary TeX under `cv/dossier-build/` (ignored) and never
commits PDFs. Run `npm ci`, `node scripts/build-cv-data.mjs`, then `node scripts/build-dossier.mjs`. For Italian abstracts, set `DOSSIER_ABSTRACTS=/path/to/abstracts-it.yaml` or pass `--abstracts /path/to/abstracts-it.yaml`.
For the owner's final package, run `/home/eduard/fm/secondmates/site-mate/data/rtt_san_raffaele_roma_2026/rebuild.sh`; it clones a clean `origin/master` scratch checkout, uses the verified-final Italian abstracts file and the locally available `ghcr.io/xu-cheng/texlive-full:20240101` image without pulling images, validates all five PDFs with veraPDF, and copies them into the sibling `package/` directory. Optional arguments are `--place <text>`, `--date <text>` and `--final`; the first two affect only that run, and `--final` sets `reviewed: true`. `DOSSIER_REPO_URL` and `DOSSIER_BRANCH` exist only to test the script against a local mirror; production defaults to the project GitHub repository and `master`.

For a manual build, use XeLaTeX in the TeX Live 2024 CI container from `cv/dossier-build/`; run `latexmk -xelatex -shell-escape titles.tex publications.tex attachments.tex cv.tex abstracts-it.tex` when translations are supplied. The shell escape is required by `pdfx` for PDF creation metadata. The visible signature line prints the declared place and date exactly as given. PDF metadata uses a parsed ISO date (accepting ISO, Italian or English month names, and DD/MM/YYYY), or the fixed fallback 2000-01-01 with a warning when a nonempty date cannot be parsed. An empty date keeps the metadata fallback and leaves the visible date blank. CI pins TeX Live 2024; the owner reports identical extracted text for the prior local TeX Live 2023 and CI builds. The files are unsigned; the owner adds a PAdES signature separately. No signature box or identity data is generated.

## Why these documents exist

The call's Art. 3 requires the signed scientific CV, a dated title list, a signed publication list,
and a signed list of attached documents. It lists “fotocopia del codice fiscale” and “fotocopia
di un documento d’identità in corso di validità.” Art. 4 says “I candidati possono presentare un
numero massimo di 12 pubblicazioni scientifiche” and foreign texts need “abstract tradotti in lingua
italiana.” Art. 8 asks the commission to consider publication “originalità, innovatività e
importanza,” fit to the SSD, “rilevanza scientifica della collocazione editoriale ... e sua
diffusione,” and “determinazione analitica ... dell’apporto individuale del candidato” for
coauthored work. It also prioritizes PhD, university teaching, research service, research-group
activity and conference presentations. These are the scope of the generated lists, not scores or
claims made by the renderer. The scientific CV remains English as requested; list language is the
`language` setting in the declaration.

## Selection and data shape

- `titles_sections` selects complete `cv.yaml` lists by section key. Every item is emitted using its
  record fields; all talks in `talks.bib` are listed from that file. The doctoral thesis line is derived from the Ph.D. entry in `content/cv.yaml` education; the dossier declaration does not duplicate it.
- `publications` is an ordered list of BibTeX keys. The renderer numbers that exact order and rejects
  unknown keys, duplicates, an empty list or more than 12. Edit keys only when the owner makes the
  final choice. The current list is marked `FINAL` in `content/dossier.yaml`; the owner must review it before signing.
  Bibliographic list entries are composed from BibTeX fields (authors, title, venue, series/volume,
  pages, year, place where present, and DOI); the files themselves remain canonical.
- `attachments` is a manifest of labels, not a claim that a document exists. The owner must assemble
  the application forms, identity/tax copies and publication PDFs separately.
- Every output, including `cv.pdf`, includes the profile name and a `Luogo e data` line. The title list groups `content/talks.bib` records into invited (`invited`), oral (`oral`) and poster (`poster`) subsections using only the declared keywords. Every record must declare exactly one classification and all four display fields (`title`, `eventtitle`, `venue`, `date`); incomplete or conflicting records stop generation. There is deliberately no
  handwritten-signature box.

Italian abstracts come from an external YAML file, not copied into this repository. Supply its path with `--abstracts /path/to/abstracts-it.yaml` or the `DOSSIER_ABSTRACTS` environment variable. The CLI option takes precedence. If neither is given, the generator prints a skip message and omits the abstracts PDF; CI does not require this owner-local file. The generator accepts rows with `position`, `bibkey` and `abstract_it`, e.g.:

```yaml
- position: 1
  bibkey: stan_jair2026b
  abstract_it: "Abstract tradotto in italiano..."
```

The generator rereads the external file on every run; do not cache its contents. CLI overrides `--place <text>`, `--date <text>` and `--reviewed true|false` apply to that invocation only; they do not edit `content/dossier.yaml`. `--reviewed false` keeps the `BOZZA` footer. It follows the selected key order, requires a nonempty
abstract for every selected work, and checks any supplied positions. Each numbered abstract entry
prints the English title and authors from BibTeX before the translation. The call requires translated abstracts for foreign-language submitted texts, so confirm all five PDFs exist before filing.

`reviewed: false` adds `BOZZA` in the footer of generated PDFs; the declaration owner must switch it
after reviewing the finished content. The owner-selected twelve remain subject to review before signing.

The call's Art. 3–4 and 8 excerpts above were transcribed from `data/bando-rtt-iinf05a.pdf`,
`pdftotext -layout`, pp. 8–11; the call PDF is maintained outside this repository.
