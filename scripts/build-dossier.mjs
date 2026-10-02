#!/usr/bin/env node
// Render the dossier declaration over the same cv.yaml and BibTeX used by the site/CV.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { metadataDate } from "./dossier-date.mjs";
import { protectBibtexValues, protectNoBreak } from "./dossier-nobreak.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const data = load(read("content/cv.yaml"));
const spec = load(read("content/dossier.yaml"));
const cli = process.argv.slice(2);
for (let i = 0; i < cli.length; i++) {
  if (cli[i] === "--place" || cli[i] === "--date" || cli[i] === "--reviewed") {
    const flag = cli[i],
      value = cli[++i];
    if (!value) throw Error(`${flag} requires a value`);
    if (flag === "--place") spec.place = value;
    if (flag === "--date") spec.date = value;
    if (flag === "--reviewed") {
      if (!["true", "false"].includes(value)) throw Error("--reviewed must be true or false");
      spec.reviewed = value === "true";
    }
  }
}
const keyFlag = cli.indexOf("--check-keys");
if (keyFlag >= 0) spec.publications = cli[keyFlag + 1].split(",");
const out = resolve(root, "cv/dossier-build");
mkdirSync(out, { recursive: true });
const parsedDate = metadataDate(spec.date);
if (spec.date && !parsedDate) console.warn(`Warning: could not parse dossier date ${JSON.stringify(spec.date)}; using 2000-01-01 for PDF metadata.`);
const metadataIsoDate = parsedDate || "2000-01-01";
const compactDate = metadataIsoDate.replaceAll("-", "");
writeFileSync(
  resolve(out, "creationdate.lua"),
  `os.remove("creationdate.timestamp")\nio.output("creationdate.timestamp"):write("\\\\edef\\\\tempa{\\\\string D:${compactDate}000000}\\n\\\\def\\\\tempb{+0000}")\n`
);
const esc = (s) =>
  protectNoBreak(
    String(s ?? "")
      .replace(
        /[\\&%$#_{}~^]/g,
        (c) =>
          ({
            "\\": "\\textbackslash{}",
            "&": "\\&",
            "%": "\\%",
            $: "\\$",
            "#": "\\#",
            _: "\\_",
            "{": "\\{",
            "}": "\\}",
            "~": "\\textasciitilde{}",
            "^": "\\textasciicircum{}",
          })[c]
      )
      .replace(/—/g, "---")
      .replace(/–/g, "--")
      .replace(/‑/g, "{-}")
      .replace(/⁺/g, "\\textsuperscript{+}")
  );
const escExact = (s) => {
  let openingQuote = true;
  return esc(s).replace(/[\'"]/g, (c) => {
    if (c === "'") return String.raw`\char"27{}`;
    const quote = openingQuote ? String.raw`\textquotedblleft{}` : String.raw`\textquotedblright{}`;
    openingQuote = !openingQuote;
    return quote;
  });
};
const plain = (s) =>
  String(s ?? "")
    .replace(/\\(?:textit|textbf|emph|url|href)\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\'\{([aeiouAEIOU])\}/g, (_, vowel) => {
      const acute = { a: "á", e: "é", i: "í", o: "ó", u: "ú" }[vowel.toLowerCase()];
      return vowel === vowel.toUpperCase() ? acute.toUpperCase() : acute;
    })
    .replace(/\\[{}]/g, "")
    .replace(/\\&/g, "&")
    .replace(/\\_/g, "_")
    .replace(/\\%/g, "%")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
function parseBib(text) {
  const entries = new Map();
  let i = 0;
  while ((i = text.indexOf("@", i)) >= 0) {
    const m = /^@\w+\s*[({]\s*([^,\s]+)\s*,/.exec(text.slice(i));
    if (!m) {
      i++;
      continue;
    }
    const key = m[1],
      start = i + m[0].length;
    let depth = 1,
      j = start,
      quote = false;
    for (; j < text.length && depth; j++) {
      const c = text[j];
      if (c === '"' && text[j - 1] !== "\\") quote = !quote;
      if (!quote) {
        if (c === "{") depth++;
        if (c === "}") depth--;
      }
    }
    const body = text.slice(start, j - 1),
      fields = {};
    const re = /([\w-]+)\s*=\s*/g;
    let f;
    while ((f = re.exec(body))) {
      let k = f[1].toLowerCase(),
        p = re.lastIndex,
        c = body[p],
        v = "";
      if (c === "{") {
        let d = 1,
          q = p + 1;
        for (; q < body.length && d; q++) {
          if (body[q] === "{") d++;
          if (body[q] === "}") d--;
        }
        v = body.slice(p + 1, q - 1);
        re.lastIndex = q;
      } else if (c === '"') {
        let q = p + 1;
        while (q < body.length && (body[q] !== '"' || body[q - 1] === "\\")) q++;
        v = body.slice(p + 1, q);
        re.lastIndex = q + 1;
      } else {
        const q = body.indexOf(",", p);
        v = body.slice(p, q < 0 ? body.length : q).trim();
        re.lastIndex = q < 0 ? body.length : q;
      }
      fields[k] = v;
    }
    entries.set(key, fields);
    i = j;
  }
  return entries;
}
const publicationBib = protectBibtexValues(read("content/publications.bib"));
const talksBib = protectBibtexValues(read("content/talks.bib"));
writeFileSync(resolve(out, "publications-dossier.bib"), publicationBib);
writeFileSync(resolve(out, "talks-dossier.bib"), talksBib);
const pubs = parseBib(read("content/publications.bib"));
const talks = parseBib(read("content/talks.bib"));
if (!Array.isArray(spec.publications) || spec.publications.length > 12 || spec.publications.length < 1)
  throw Error("publication selection must contain 1–12 keys");
if (new Set(spec.publications).size !== spec.publications.length) throw Error("duplicate publication key");
for (const k of spec.publications) if (!pubs.has(k)) throw Error(`unknown publication key: ${k}`);
for (const k of spec.publications) {
  const f = pubs.get(k);
  const missing = ["doi", "volume"].filter((field) => !f[field]?.trim()).concat(!f.pages?.trim() && !f.eid?.trim() ? ["pages/eid"] : []);
  if (missing.length) console.warn(`Selected publication ${k} has no ${missing.join(", ")}`);
}
if (keyFlag >= 0) {
  console.log("Publication selection is valid");
  process.exit(0);
}
for (const k of spec.titles_sections) if (!Array.isArray(data[k])) throw Error(`unknown title section: ${k}`);
if (!Array.isArray(spec.attachments) || !spec.attachments.length) throw Error("attachments manifest must not be empty");
const italian = spec.language === "it";
const date = escExact(spec.date),
  place = escExact(spec.place),
  name = esc(data.profile.name);
const line = `\\par\\medskip\\noindent\\textbf{\\textitalian{Luogo e data:}} ${place ? `${place}, ` : ""}${date || "\\rule{3cm}{0.4pt}"}\\par\\vspace{1em}`;
const draftFooter = spec.reviewed === false ? String.raw`\pagestyle{fancy}\fancyhf{}\fancyfoot[C]{BOZZA}\renewcommand{\headrulewidth}{0pt}` : "";
function doc(title, body) {
  return `\\documentclass[a4paper,11pt]{article}\n\\usepackage[a-2b]{pdfx}\n\\usepackage[margin=25mm]{geometry}\n\\usepackage{fontspec}\n\\usepackage{polyglossia}\n\\setmainlanguage{english}\n\\setotherlanguage{italian}\n\\setmainfont{TeX Gyre Pagella}\n\\usepackage{enumitem}\n\\usepackage{fancyhdr}\n\\begin{document}\n\\sloppy${draftFooter}\n\\begin{center}{\\Large\\bfseries ${italian ? `\\textitalian{${esc(title)}}` : esc(title)}}\\end{center}\n\\noindent\\textbf{${name}}\\par\\medskip\n${body}\n${line}\\end{document}\n`;
}
function item(e) {
  const years = (e.years || [])
    .map((value) => (typeof value === "number" ? value : value?.year))
    .filter(Boolean)
    .join(", ");
  return `\\item \\textbf{${esc(e.title)}}${e.org ? `, ${esc(e.org)}` : ""}${e.place ? `, ${esc(e.place)}` : ""}${e.dates ? ` (${esc(e.dates)})` : years ? ` (${esc(years)})` : ""}${e.detail ? `. ${esc(e.detail)}` : ""}`;
}
const titles = spec.titles_sections.flatMap((k) => data[k].map((e) => ({ section: k, entry: e })));
const label = {
  education: "Formazione",
  appointments: "Incarichi",
  teaching: "Attività didattica",
  projects: "Progetti di ricerca",
  awards: "Premi e riconoscimenti",
  service: "Attività editoriale, organizzazione e revisione",
};
const groupedTitles = spec.titles_sections
  .map((k) => `\\subsection*{\\textitalian{${esc(label[k] || k)}}}\n\\begin{itemize}[leftmargin=*]${data[k].map(item).join("\n")}\\end{itemize}`)
  .join("\n");
const talkGroups = { invited: [], oral: [], poster: [] };
for (const [key, f] of talks) {
  const keywords = (f.keywords || "").split(/[\s,]+/).filter(Boolean);
  const classes = ["invited", "oral", "poster"].filter((kind) => keywords.includes(kind));
  if (classes.length !== 1) throw Error(`talk ${key} must have exactly one invited/oral/poster keyword`);
  if (![f.title, f.eventtitle, f.venue, f.date].every((value) => typeof value === "string" && value.trim()))
    throw Error(`talk ${key} must record title, eventtitle, venue and date`);
  const date = plain(f.date);
  const details = [plain(f.eventtitle), plain(f.venue), date].join(", ");
  talkGroups[classes[0]].push(`\\item \\textbf{${esc(plain(f.title))}}. ${esc(details)}.`);
}
const talkSection = `\\section*{\\textitalian{Relazioni a congressi e convegni}}\n${[
  ["invited", "Relazioni su invito"],
  ["oral", "Presentazioni orali"],
  ["poster", "Poster"],
]
  .map(([kind, title]) => `\\subsection*{\\textitalian{${title}}}\n\\begin{itemize}[leftmargin=*]${talkGroups[kind].join("\n")}\\end{itemize}`)
  .join("\n")}`;

const doctorate = data.education.find((entry) => /ph\.?\s*d/i.test(entry.title) && entry.detail);
const doctorateYear = doctorate?.dates?.match(/(?:19|20)\d{2}/g)?.at(-1);
const thesisSection = doctorate
  ? `\n\\subsection*{\\textitalian{Tesi di dottorato}}\n\\begin{itemize}[leftmargin=*]\\item \\textbf{${esc(plain(doctorate.detail))}}. ${esc(plain(doctorate.org))}${doctorateYear ? `, ${doctorateYear}` : ""}.\\end{itemize}`
  : "";
const titleBody = groupedTitles + `\n${talkSection}` + thesisSection;
// BibLaTeX renders the canonical records, in the citation order declared in YAML.
const citationKeys = spec.publications.join(",");
const pubBody = `\\nocite{${citationKeys}}\n\\printbibliography[heading=none]`;
const journalEidMacro = String.raw`\renewbibmacro*{journal+issuetitle}{%
  \usebibmacro{journal}%
  \setunit*{\addspace}%
  \iffieldundef{series}
    {}
    {\newunit
     \printfield{series}%
     \setunit{\addspace}}%
  \ifentrytype{article}
    {\printfield{volume}%
     \setunit*{\adddot}%
     \printfield{number}%
     \setunit{\addspace}%
     \usebibmacro{issue+date}%
     \iffieldundef{eid}{}{\setunit{\addcomma\space}\printfield{eid}}}
    {\usebibmacro{volume+number+eid}%
     \setunit{\addspace}%
     \usebibmacro{issue+date}}%
  \setunit{\addcolon\space}%
  \printfield{issue}%
  \newunit}`;

const manifest = spec.attachments.map((x) => `\\item \\textitalian{${escExact(x)}}`).join("\n");
for (const [base, title] of [
  ["titles", "Elenco dei titoli"],
  ["publications", "Elenco delle pubblicazioni presentate"],
  ["attachments", "Elenco dei documenti allegati alla domanda"],
])
  writeFileSync(
    resolve(out, `${base}.xmpdata`),
    `\\Title{${title}}\n\\Author{${data.profile.name}}\n\\Language{it-IT}\n\\Date{${metadataIsoDate}}\n`
  );
writeFileSync(resolve(out, "cv.xmpdata"), `\\Title{Scientific CV}\n\\Author{${data.profile.name}}\n\\Language{en-US}\n\\Date{${metadataIsoDate}}\n`);
writeFileSync(resolve(out, "titles.tex"), doc(italian ? "Elenco dei titoli" : "List of titles", titleBody));
writeFileSync(
  resolve(out, "publications.tex"),
  doc(italian ? "Elenco delle pubblicazioni presentate" : "List of submitted publications", pubBody).replace(
    "\\usepackage{enumitem}",
    `\\usepackage{enumitem}\n\\usepackage[backend=biber,style=numeric,sorting=none,maxnames=99,minnames=99,maxbibnames=99,minbibnames=99,maxcitenames=99,mincitenames=99]{biblatex}\n\\renewcommand*{\\finalnamedelim}{\\addspace e\\space}\n\\DeclareFieldFormat{eid}{Article~#1}\n${journalEidMacro}\n\\DeclareFieldFormat{issn}{}\n\\addbibresource{publications-dossier.bib}`
  )
);
writeFileSync(
  resolve(out, "attachments.tex"),
  doc(
    italian ? "Elenco dei documenti allegati alla domanda" : "List of application attachments",
    `\\begin{enumerate}[leftmargin=*]${manifest}\\end{enumerate}`
  )
);
// CV variant: shared authored layout and generated macros; education already carries the thesis.
let cv = read("cv/cv.tex");
let shared = read("cv/preamble.tex")
  .replaceAll("../content/", "../../content/")
  .replace(
    "\\documentclass[a4paper,11pt]{article}",
    "\\documentclass[a4paper,11pt]{article}\n\\PassOptionsToPackage{hidelinks}{hyperref}\n\\usepackage[a-2b]{pdfx}"
  );

cv = cv.replaceAll("../content/", "../../content/");
// Keep the dossier CV's biblatex inputs byte-identical to the public CV's canonical records.
// No-break TeX wrappers are safe in rendered dossier lists but invalidate BibLaTeX date parsing.
writeFileSync(resolve(out, "preamble.tex"), shared);
copyFileSync(resolve(root, "cv/header.tex"), resolve(out, "header.tex"));
copyFileSync(resolve(root, "cv/supervision.tex"), resolve(out, "supervision.tex"));
mkdirSync(resolve(out, "generated"), { recursive: true });
writeFileSync(resolve(out, "generated/cv-data.tex"), read("cv/generated/cv-data.tex"));
cv = cv.replace("\\begin{document}", `\\begin{document}\n${draftFooter}`);
const cvLine = `\\par\\medskip\\noindent\\textbf{Luogo e data:} ${place ? `${place}, ` : ""}${date || "\\rule{3cm}{0.4pt}"}\\par\\vspace{1em}`;
const cvEnd = cv.lastIndexOf("\\end{document}");
if (cvEnd < 0) throw Error("CV document has no \\end{document}");
cv = `${cv.slice(0, cvEnd)}${cvLine}\n${cv.slice(cvEnd)}`;
writeFileSync(resolve(out, "cv.tex"), cv);
// Optional external YAML list: [{position, bibkey, abstract_it}].
const args = cli;
const ai = args.indexOf("--abstracts");
const abstractArgument = ai >= 0 ? args[ai + 1] : process.env.DOSSIER_ABSTRACTS;
if (ai >= 0 && !abstractArgument) throw Error("--abstracts requires a file path");
// English terms retained in the Italian abstracts, including named logics, methods and models.
// Their tokens are no-break exceptions in both document languages so Italian patterns cannot
// split the English vocabulary and citation titles cannot reintroduce a break.
const englishNoBreakTerms = [
  "many-valued",
  "FLew",
  "frame",
  "tableau",
  "framework",
  "open source",
  "post hoc",
  "deep learning",
  "feedback",
  "governance",
  "Symbolic Knowledge Extraction",
  "Symbolic Knowledge Injection",
  "XAI",
  "NLP",
  "PSpace",
  "benchmark",
  "benchmarking",
  "decision",
  "decision tree",
  "temporal decision tree",
  "random forest",
  "fuzzy",
  "FHS",
  "big data",
  "data science",
  "data mining",
  "pattern",
  "trip",
  "record",
  "SKE",
  "SKI",
  "HS3",
  "HS7",
  "ID3",
  "C4.5",
  "Weka",
  "J48",
  "Temporal ID3",
  "Temporal C4.5",
  "Temporal J48",
  "Large Language Models",
  "LLMs",
  "LTL",
  "Gemma 3 27b It",
  "Llama 4 Maverick",
  "DeepSeek Chat V3 release 0324",
  "Qwen 3 32b",
  "Qwen 3 235b",
];
const englishNoBreakWords = [...new Set(englishNoBreakTerms.flatMap((term) => term.match(/[A-Za-z]+/g) || []))]
  .filter((word) => word.length > 1)
  .map((word) => word.toLowerCase())
  .sort();
const noBreakHyphenation = ["english", "italian"]
  .map((language) => `\\begingroup\\language=\\l@${language}\\hyphenation{${englishNoBreakWords.join(" ")}}\\endgroup`)
  .join("\n");
const noBreakPreamble = `\\makeatletter\n${noBreakHyphenation}\n\\makeatother`;
const abstractPath = abstractArgument ? resolve(abstractArgument) : undefined;
if (abstractPath && !existsSync(abstractPath)) throw Error(`abstracts file not found: ${abstractPath}`);
if (abstractPath) {
  const raw = load(readFileSync(abstractPath, "utf8")) || [];
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.abstracts)
      ? raw.abstracts
      : Object.entries(raw)
          .filter(([key]) => key !== "status")
          .map(([bibkey, value]) => (value && typeof value === "object" ? { bibkey, ...value } : { bibkey, abstract_it: value }));
  const indexed = new Map(rows.map((row) => [row.bibkey, row]));
  for (const [i, k] of spec.publications.entries()) {
    const row = indexed.get(k);
    if (!row || typeof row.abstract_it !== "string" || !row.abstract_it.trim())
      throw Error(`selected publication ${k} is missing its Italian abstract`);
    if (row.position !== undefined && Number(row.position) !== i + 1) throw Error(`abstract position for ${k} must be ${i + 1}`);
  }
  const body = `\\begin{enumerate}[leftmargin=*]${spec.publications.map((k) => `\\item {\\hyphenpenalty=10000\\exhyphenpenalty=10000\\textbf{\\citetitle{${k}}}\\\\\\citeauthor{${k}}.\\par}\\medskip \\begin{italian}${esc(indexed.get(k).abstract_it)}\\end{italian}`).join("\n")}\\end{enumerate}`;
  const abstractTex = doc("Abstract tradotti in italiano", body).replace(
    "\\usepackage{enumitem}",
    `\\usepackage{enumitem}\n${noBreakPreamble}\n\\usepackage[backend=biber,style=numeric,sorting=none,maxnames=99,minnames=99,maxbibnames=99,minbibnames=99,maxcitenames=99,mincitenames=99]{biblatex}\n\\renewcommand*{\\finalnamedelim}{\\addspace e\\space}\n\\addbibresource{publications-dossier.bib}`
  );
  writeFileSync(resolve(out, "abstracts-it.tex"), abstractTex);
  writeFileSync(
    resolve(out, "abstracts-it.xmpdata"),
    `\\Title{Abstract tradotti in italiano}\n\\Author{${data.profile.name}}\n\\Language{it-IT}\n\\Date{${metadataIsoDate}}\n`
  );
} else {
  for (const suffix of [".tex", ".xmpdata", ".pdf"]) rmSync(resolve(out, `abstracts-it${suffix}`), { force: true });
  console.log("Italian abstracts skipped: pass --abstracts <path> or set DOSSIER_ABSTRACTS.");
}
console.log(`Rendered dossier (${spec.publications.length} publication entries, ${titles.length} title entries) to ${out}`);
