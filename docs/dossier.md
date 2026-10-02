# Application dossier generator

`content/dossier.yaml` is the only dossier-specific selection. The generator reads the same
`content/cv.yaml`, `content/publications.bib`, `content/talks.bib` and generated CV macros as the
site and printed CV. It creates temporary TeX under `cv/dossier-build/` (ignored) and never
commits PDFs. Run `npm ci`, `node scripts/build-cv-data.mjs`, then `node scripts/build-dossier.mjs`.
Build the generated files with XeLaTeX in the TeX Live 2024 container from
`cv/dossier-build/`; use `latexmk -xelatex -shell-escape titles.tex publications.tex attachments.tex abstracts-it.tex cv.tex`. The `abstracts-it.tex` target is present only when the external abstracts file is available. The shell escape is required by `pdfx` for PDF creation metadata. The generator fixes that metadata date to the declared date, or to 2000-01-01 when the declaration leaves the date blank; the visible signature-date line stays blank. Validate every produced PDF with veraPDF before signing. The files are unsigned; the owner adds a
PAdES signature separately. No signature box or identity data is generated.

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
  record fields; all talks in `talks.bib` are listed from that file. The doctoral thesis title,
  institution and year are explicitly represented in the dossier declaration because they are not
  yet in the shared CV record; the CV variant includes this one required title.
- `publications` is an ordered list of BibTeX keys. The renderer numbers that exact order and rejects
  unknown keys, duplicates, an empty list or more than 12. Edit keys only when the owner makes the
  final choice. The current list is explicitly marked `PLACEHOLDER - owner selection pending`.
  Bibliographic list entries are composed from BibTeX fields (authors, title, venue, series/volume,
  pages, year, place where present, and DOI); the files themselves remain canonical.
- `attachments` is a manifest of labels, not a claim that a document exists. The owner must assemble
  the application forms, identity/tax copies and publication PDFs separately.
- Every output includes the profile name and a `Luogo e data` line. There is deliberately no
  handwritten-signature box.

Italian abstracts use the YAML file named by `abstracts_path` in `content/dossier.yaml`. It is an external file, not copied into this repository. The generator accepts rows with `position`, `bibkey` and `abstract_it`, e.g.:

```yaml
- position: 1
  bibkey: stan_jair2026b
  abstract_it: "Abstract tradotto in italiano..."
```

The generator rereads `abstracts_path` on every run when it exists; do not cache the external file contents. `node scripts/build-dossier.mjs --abstracts
/path/to/abstracts-it.yaml` overrides it. It follows the selected key order, requires a nonempty
abstract for every selected work, and checks any supplied positions. Each numbered abstract entry
prints the English title and authors from BibTeX before the translation. It omits the abstract PDF
only when the declared path is absent (for example, in CI where owner-local translation files are
not present). The call requires translated abstracts for foreign-language submitted texts, so
confirm all five PDFs exist before filing.

`reviewed: false` adds `BOZZA` in the footer of generated PDFs; the declaration owner must switch it
after reviewing the finished content. The current final twelve remain subject to that owner review
before signing.

The call's Art. 3–4 and 8 excerpts above were transcribed from `data/bando-rtt-iinf05a.pdf`,
`pdftotext -layout`, pp. 8–11; the call PDF is maintained outside this repository.
