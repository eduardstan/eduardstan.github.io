#!/usr/bin/env node
// =============================================================================
// build-cv-data.mjs - render content/cv.yaml into LaTeX content macros.
//
//   node scripts/build-cv-data.mjs            regenerate the .tex files
//   node scripts/build-cv-data.mjs --check    fail if the committed file is stale
//
// Outputs
//   cv/generated/cv-data.tex  COMMITTED, checked for staleness
//
// cv/preamble.tex owns layout; this script owns nothing but the mapping from facts to
// content macros. It never invents, reorders or rewords anything in cv.yaml.
//
// It knows the field names of `profile:` and NOTHING about which sections exist:
// every other top-level list is a section by construction, and each one becomes
// the same six macros. Adding `fieldwork:` to content/cv.yaml gives you
// \cvFieldworkNote, \cvFieldwork, \cvFieldworkRows, \cvFieldworkHeader,
// \cvFieldworkInline and \cvFieldworkCount without touching this file. See
// cv/preamble.tex for the contract.
//
// It also emits \cvAutoSections: one \cvautopart line per section, in the order
// content/cv.yaml writes them, so which sections the PDF prints is a record fact
// rather than a list of \cvpart lines in cv/cv.tex, which skips the ones it lays
// out by hand. `printed: false` on a section emits \cv<Key>Printed as 0 instead
// of a second sequence rule, so the opt-out holds for a hand-laid-out section too.
//
// A top-level key holding `sections:` instead of entries is a bibliography
// grouping (`publications:`, `talks:`): each becomes \defbibfilter definitions
// plus \cv<Key>Key, \cv<Key>Sections and \cv<Key>Count. It knows no BibTeX entry
// type either.
// =============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CV_YAML = join(ROOT, "content", "cv.yaml");
const OUT_DIR = join(ROOT, "cv", "generated");
const OUT_PUBLIC = join(OUT_DIR, "cv-data.tex");

// -----------------------------------------------------------------------------
// LaTeX escaping
// -----------------------------------------------------------------------------

const ESCAPES = {
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
};

// Characters the repository owner writes as real Unicode because they carry typographic
// meaning. Applied after escaping, so their replacements are emitted verbatim.
const TYPOGRAPHY = [
  ["—", "---"], // em dash
  ["–", "--"], // en dash
  ["‑", "{-}"], // non-breaking hyphen: suppress the line break here
  ["⁺", "$^{+}$"], // superscript plus, e.g. Erasmus+
  ["€", "\\euro{}"], // euro sign
];

/** Escape every LaTeX special, then map the typographic Unicode characters. */
function escapeLatex(text) {
  let out = String(text).replace(/[\\&%$#_{}~^]/g, (c) => ESCAPES[c]);
  for (const [from, to] of TYPOGRAPHY) out = out.split(from).join(to);
  return out;
}

/**
 * Escape a URL for the first argument of \href. Every \href produced here ends
 * up inside a \newcommand body, so the URL is tokenised when the macro is
 * defined and hyperref's catcode normalisation can no longer rescue it: `~`
 * would become \nobreakspace (a silently wrong link target), `_` a subscript,
 * `\` a line break. Only `%`, `#` and `&` survive as escapes; anything else TeX
 * consumes raises rather than guessing.
 */
const URL_UNSAFE = /[\\~_^${}]/;

function escapeUrl(url) {
  const text = String(url);
  const bad = URL_UNSAFE.exec(text);
  if (bad) {
    throw new Error(
      `unsafe character "${bad[0]}" in URL: ${text}\n` +
        "  \\href here is tokenised inside a \\newcommand body, so it cannot survive.\n" +
        "  Percent-encode it (~ is %7E, _ is %5F, \\ is %5C) in content/cv.yaml."
    );
  }
  return text.replace(/([%#&])/g, "\\$1");
}

// -----------------------------------------------------------------------------
// Inline markup: **bold**, _italic_, [text](url)
//
// Markup is tokenised BEFORE escaping so that a URL is never mangled and so that
// the `_` of _italic_ is not turned into \_. A bare `*` is left alone, which
// keeps "CORE Rank: A*" safe.
//
// `_` follows Markdown's intra-word rule: an underscore with a word character on
// BOTH sides (a_b, snake_case, file_name.txt) is literal and never delimits an
// emphasis span. The website renderer reads the same cv.yaml, so the two must
// agree on what `_` means. Anything left over that still looks like a delimiter
// is an unclosed span and raises - emitting valid LaTeX with silently wrong
// emphasis is the one failure that passes every check and reaches the PDF.
// -----------------------------------------------------------------------------

const W = "A-Za-z0-9";
const MARKUP = String.raw`\*\*([\s\S]+?)\*\*|(?<![${W}])_(?=[^\s_])([^_\n]+?)(?<=[^\s_])_(?![${W}])|\[([^\]\n]+)\]\(([^)\s]+)\)`;

/** A delimiter-shaped `**` or `_` surviving outside every matched span. */
const STRAY = new RegExp(String.raw`\*\*|(?<![${W}])_|_(?![${W}])`);

/** Escape a run of plain text, refusing one that carries an unclosed delimiter. */
function literal(chunk, src) {
  const m = STRAY.exec(chunk);
  if (m) {
    throw new Error(
      `unbalanced inline markup: "${m[0]}" at "${chunk.slice(Math.max(0, m.index - 20), m.index + 20)}"\n` +
        `  in: ${src}\n` +
        "  Close the span, or write the underscore inside a word (a_b) where it stays literal."
    );
  }
  return escapeLatex(chunk);
}

function renderInline(text) {
  const src = String(text ?? "");
  // A fresh matcher per call: renderInline recurses, and a shared regex's
  // lastIndex would be reset by the inner call and restart the outer scan.
  const re = new RegExp(MARKUP, "g");
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    out += literal(src.slice(last, m.index), src);
    if (m[1] !== undefined) out += `\\textbf{${renderInline(m[1])}}`;
    else if (m[2] !== undefined) out += `\\emph{${renderInline(m[2])}}`;
    else out += `\\href{${escapeUrl(m[4])}}{${renderInline(m[3])}}`;
    last = m.index + m[0].length;
  }
  return out + literal(src.slice(last), src);
}

/** Render a value that must survive as a LaTeX macro argument (never empty-unsafe). */
const arg = (value) => renderInline(value ?? "");

// -----------------------------------------------------------------------------
// One entry shape, every section
// -----------------------------------------------------------------------------

/** `\resumeItemListStart ... \resumeItemListEnd`, or nothing when there are no items. */
function itemList(items) {
  if (!items || !items.length) return "";
  const body = items.map((i) => `  \\item ${renderInline(i)}`).join("\n");
  return `\\resumeItemListStart\n${body}\n\\resumeItemListEnd`;
}

/** `2024, 2025, 2026` folded to `2024--2026`; a lone list left as written. */
function editions(years) {
  if (!years?.length) return "";
  const list = years.map((y) => (typeof y === "object" ? y.year : y));
  const consecutive = list.every((y, i) => i === 0 || y === list[i - 1] + 1);
  return list.length > 1 && consecutive ? `${list[0]}–${list.at(-1)}` : list.join(", ");
}

/**
 * The second line of an entry: where it was, plus whatever qualifies it.
 *
 * One rule for every section - an appointment states only `org`, a project only
 * `detail`, a service role both plus its editions and its ranking.
 */
function where(entry) {
  const line = [entry.org, entry.detail, editions(entry.years), entry.rows?.length ? "" : entry.count].filter(Boolean).join(", ");
  return entry.metric ? `${line} **[${entry.metric}]**` : line;
}

function tableKeys(rows, strict = true) {
  const keys = Object.keys(rows[0] ?? {});
  if (strict) {
    for (const [index, row] of rows.entries()) {
      const actual = Object.keys(row);
      if (actual.join("\0") !== keys.join("\0")) {
        throw new Error(
          `rows[${index}] has columns ${actual.join(", ")}; expected ${keys.join(", ")} in the same order.\n` +
            "  Every row in one table must declare the same columns in the same order."
        );
      }
    }
  }
  return keys;
}

/**
 * One cell. A value in cv.yaml is not always a string: `years:` is a list that
 * may hold `{ year, announced }` maps and `rows:` is a nested table, and
 * String() turns either into `[object Object]`. A list of editions folds exactly
 * as it does on an entry's second line; any other structure is its own values,
 * rendered the same way.
 */
function cell(value) {
  const edition = (v) => v !== null && (typeof v !== "object" || v.year !== undefined);
  if (Array.isArray(value)) return value.every(edition) ? arg(editions(value)) : value.map(cell).join(", ");
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return value.year !== undefined ? cell(value.year) : Object.values(value).map(cell).join(" ");
  }
  return arg(value);
}

/** `a & b & c \\` - the row's own keys, in their validated order. */
const tableRows = (rows, strict = true) => {
  tableKeys(rows, strict);
  return rows.map((r) => `${Object.values(r).map(cell).join(" & ")} \\\\`).join("\n");
};

/** One word, capitalised. The generator's only casing rule. */
const capitalise = (word) => word[0].toUpperCase() + word.slice(1);

/**
 * A section key as a heading: every word capitalised, separators untouched.
 *
 * Section keys derive from identifiers (e.g. `field_work` -> "Field Work")
 * when a section does not declare an explicit `heading:`, and the generated
 * per-section table header names those schema fields. Course-table column
 * headers, by contrast, are printed verbatim as written in the record: a row
 * key is a fact the website publishes on its provenance line, so it prints as
 * the adopter wrote it, here and there.
 *
 * The website has its own copy of this rule (`headingCase` in
 * `web/src/lib/cv-schema.ts`) for the announcement kind chips on /lately/. No
 * heading passes through both, so the two are independent, not a pair to keep
 * in step.
 */
const headingCase = (key) => key.replace(/[\p{L}\p{N}]+/gu, capitalise);

/** Course-table labels stay verbatim; per-section schema fields explicitly pass `headingCase`. */
const tableHeader = (rows, strict = true, displayKey = (key) => key) =>
  `${tableKeys(rows, strict)
    .map((key) => `\\textbf{${escapeLatex(displayKey(key))}}`)
    .join(" & ")} \\\\`;

/** One `\cventry`, plus its bullets and its table where it has them. */
function entry(item) {
  const head = `\\cventry\n  {${arg(item.title)}}\n  {${arg(where(item))}}\n` + `  {${arg(item.dates)}}\n  {${arg(item.place)}}`;
  const table = item.rows?.length
    ? `\\cvcourses{${tableKeys(item.rows)
        .map(() => "Y")
        .join(" ")}}{${tableHeader(item.rows)}}{\n${tableRows(item.rows)}}`
    : "";
  return [head, itemList(item.items), table].filter(Boolean).join("\n");
}

/**
 * The words of a section key, each capitalised: `field_work` -> [Field, Work].
 *
 * ASCII-only, because a macro name is: this feeds `macroName`, not a heading.
 */
const keyWords = (key) =>
  key
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(capitalise);

/** `field_work` -> `FieldWork`, so a section key becomes a legal macro name. */
const macroName = (key) => keyWords(key).join("");

/**
 * The heading a section prints under: the one it states, or its own key.
 *
 * `fieldwork:` prints as "Fieldwork" with nothing declared, which is what makes a
 * new section print without a LaTeX edit. A section whose heading is not its key
 * spelt out - "Awards & Scholarships" - says so with `heading:`.
 *
 * The key becomes a heading by `headingCase`, with
 * its separators read as spaces: `field_work` prints "Field Work", not
 * "Field_Work". Not `keyWords`, which is ASCII because macro names are.
 */
const sectionHeading = (key, value) =>
  arg((Array.isArray(value) ? undefined : value.heading) ?? headingCase(key.replace(/[^\p{L}\p{N}]+/gu, " ").trim()));

function macro(name, body) {
  return `\\newcommand{\\${name}}{%\n${body}%\n}`;
}

// -----------------------------------------------------------------------------
// Bibliography sections
//
// A section is a title plus a filter. `publications:` and `talks:` in cv.yaml
// declare them; this translates each one into the biblatex filter it means and
// into the \printbibliography that prints it. No entry type is named here, so
// an adopter whose career is books, datasets or patents declares a section and
// it works - without editing cv/cv.tex.
// -----------------------------------------------------------------------------

/** A filter token goes into biblatex unbraced, so it must be a bare word. */
const TOKEN = /^[A-Za-z0-9][A-Za-z0-9.-]*$/;

function token(value, where) {
  if (!TOKEN.test(String(value ?? ""))) {
    throw new Error(
      `${where}: "${value}" is not a usable BibTeX entry type or keyword.\n` +
        "  It is written straight into a biblatex filter, so it must be a bare word."
    );
  }
  return value;
}

/**
 * An entry type, in the one case both consumers can see it in.
 *
 * biber lowercases every entry type before a filter is tested against it, and
 * the website's BibTeX reader does the same, so `type=Article` selects nothing
 * anywhere. Raising is the difference between an adopter reading this sentence
 * and an adopter watching a declared section come out empty.
 */
function entryType(value, where) {
  const type = token(value, where);
  if (type !== String(type).toLowerCase()) {
    throw new Error(
      `${where}: "${type}" must be written in lower case.\n` +
        "  biber lowercases every entry type before testing a filter against it, so a\n" +
        "  section declaring an upper-case type would match nothing, in the PDF or on the site."
    );
  }
  return type;
}

/**
 * The biblatex filter one declared section means: any of `types`, all of
 * `keywords`, none of `exclude_keywords`. That is the whole grammar.
 */
function bibFilter(section, where) {
  const clauses = [];
  const types = (section.types ?? []).map((t) => `type=${entryType(t, `${where}.types`)}`);
  if (types.length === 1) clauses.push(types[0]);
  else if (types.length) clauses.push(`( ${types.join(" or ")} )`);
  for (const k of section.keywords ?? []) clauses.push(`keyword=${token(k, `${where}.keywords`)}`);
  for (const k of section.exclude_keywords ?? []) clauses.push(`not keyword=${token(k, `${where}.exclude_keywords`)}`);
  if (!clauses.length) {
    throw new Error(
      `${where}: a section needs at least one of types, keywords or exclude_keywords.\n` +
        "  A section with no filter would print the whole bibliography under its own heading."
    );
  }
  return clauses.join(" and ");
}

/** The numbering letter: declared, or the first letter of the short name. */
const bibPrefix = (section) =>
  section.prefix ??
  String(section.short ?? "")
    .slice(0, 1)
    .toUpperCase();

/**
 * A printed section's filter: its own predicate, minus every predicate declared
 * before it.
 *
 * biblatex evaluates each `\defbibfilter` on its own, so an entry that satisfies
 * two of them is printed twice - while the website labels it with the FIRST
 * section it matches. Subtracting the earlier predicates is what makes
 * first-match-wins hold identically on both sides. Sections carrying
 * `printed: false` are subtracted too: they claim the entry on the website, so
 * a printed section below one of them must not claim it again.
 */
const afterEarlier = (own, earlier) => [own, ...earlier.map((predicate) => `not ( ${predicate} )`)].join(" and ");

/**
 * How many entries `content/<key>.bib` holds, as \cv<Key>Count for cv.tex.
 *
 * Only zero-or-not matters, and it matters a lot: biber IGNORES a data source
 * with no entries ("Data source ... is empty, ignoring"), and a \refsection
 * over a file biber dropped leaves every label number in the WHOLE document at
 * 0 - [J0] [C0] [C0] - with no error and exit 0. cv.tex skips such a refsection
 * rather than print a silently mis-numbered bibliography. Adopters start with
 * these files empty, so this is the cold-start path, not an edge case.
 */
function bibEntryCount(source) {
  const count = (text) => (text.match(/^[^%\n]*@(?!(?:comment|preamble|string)\s*[{(])\w+\s*[{(]/gim) ?? []).length;
  const directive = /^[^%\n]*@(?:comment|preamble|string)\s*([{(])/gim;
  let stripped = "";
  let end = 0;
  for (let match; (match = directive.exec(source)); directive.lastIndex = end) {
    stripped += source.slice(end, match.index);
    const [open, close] = match[1] === "{" ? ["{", "}"] : ["(", ")"];
    let depth = 1;
    let inQuotes = false;
    let escaped = false;
    for (end = directive.lastIndex; end < source.length && depth; end++) {
      if (source[end] === '"' && !escaped) inQuotes = !inQuotes;
      if (!inQuotes) depth += source[end] === open ? 1 : source[end] === close ? -1 : 0;
      escaped = source[end] === "\\" ? !escaped : false;
    }
    if (depth) return count(source);
  }
  stripped += source.slice(end);
  return count(stripped);
}

function bibFileEntryCount(key) {
  const path = join(ROOT, "content", `${key}.bib`);
  if (!existsSync(path)) return 0;
  return bibEntryCount(readFileSync(path, "utf8"));
}

/**
 * One declared bibliography, as the filters it needs and the two macros cv.tex
 * calls: the key printed beside the section header, and the sections themselves.
 *
 * EVERY declaration is validated, then the printed ones are emitted. A section
 * carrying `printed: false` is omitted from the PDF; for publications it remains
 * a name on the website, exactly as `leadership:` is a section the site renders
 * and the PDF does not. A criteria-less or nameless declaration is an error
 * rather than a whole-bibliography match in either consumer.
 */
function bibSections(key, declaration) {
  const name = macroName(key);
  const all = declaration.sections ?? [];
  const seen = new Map();
  const earlier = [];
  const printed = [];
  const filters = [];
  const bodies = [];
  all.forEach((section, index) => {
    const where = `${key}.sections[${index}]`;
    if (!section.title || !section.short) {
      throw new Error(`${where}: a section needs both a title and a short name.`);
    }
    const own = bibFilter(section, where);
    if (section.printed === false) {
      earlier.push(own);
      return;
    }
    const prefix = bibPrefix(section);
    if (seen.has(prefix)) {
      throw new Error(
        `${where}: numbering prefix "${prefix}" is already used by "${seen.get(prefix)}".\n` +
          "  Give one of them a different short name, or set `prefix:` on it."
      );
    }
    seen.set(prefix, section.short);
    printed.push(section);
    const filter = `${name}${index + 1}`;
    filters.push(`\\defbibfilter{${filter}}{${afterEarlier(own, earlier)}}`);
    bodies.push(
      `\\begin{refcontext}[labelprefix=${escapeLatex(prefix)}]\n` +
        `\\printbibliography[heading=bibsubheading, title={${arg(section.title)}}, ` +
        `filter=${filter}, resetnumbers=true]\n` +
        `\\end{refcontext}`
    );
    earlier.push(own);
  });
  return [
    filters.join("\n"),
    macro(`cv${name}Key`, printed.map((s) => `${escapeLatex(bibPrefix(s))}=${arg(s.short)}`).join(", ")),
    macro(`cv${name}Sections`, bodies.join("\n\n")),
  ].filter(Boolean);
}

// -----------------------------------------------------------------------------
// The header block
// -----------------------------------------------------------------------------

const mailto = (address) => `\\href{mailto:${escapeUrl(address)}}{${escapeLatex(address)}}`;

/** Build the header contact line from the public contact facts in cv.yaml. */
function contactLine(profile) {
  const parts = [];
  if (profile.email) parts.push(mailto(profile.email));
  if (profile.website) {
    parts.push(`\\href{${escapeUrl(profile.website.url)}}{${escapeLatex(profile.website.label)}}`);
  }
  return parts.join("\n\\;|\\;\n");
}

/**
 * A compact account ID becomes an address and a service icon. A `{label, url}`
 * value uses the neutral link icon, so new services stay inside content/.
 *
 * The four templates used to be written out as literal URLs in cv.yaml AND kept
 * here, so an adopter typed each address twice. `profile.links` now carries the
 * bare ID and this table turns it into a link.
 */
const ACCOUNTS = {
  scholar: (id) => `https://scholar.google.com/citations?user=${id}`,
  orcid: (id) => `https://orcid.org/${id}`,
  linkedin: (id) => `https://www.linkedin.com/in/${id}`,
  github: (id) => `https://github.com/${id}`,
};

function profilesLine(links = {}) {
  return Object.entries(links)
    .filter(([, value]) => value)
    .map(([kind, value]) => {
      if (typeof value === "object") {
        if (!value.label || !value.url) {
          throw new Error(`profile.links.${kind}: custom links need both label and url.`);
        }
        return `\\cviconlink\\,\\href{${escapeUrl(value.url)}}{${escapeLatex(value.label)}}`;
      }
      const url = ACCOUNTS[kind];
      if (!url)
        throw new Error(
          `profile.links: "${kind}" is not a known account kind (${Object.keys(ACCOUNTS).join(", ")}).\n` +
            `  Write it as { label: ..., url: ... } to add it without editing the machinery.`
        );
      return `\\cvicon${kind}\\,\\href{${escapeUrl(url(value))}}{${escapeLatex(value)}}`;
    })
    .join("\n\\;|\\;\n");
}

/**
 * The address block under the name: your role and your first affiliation, then
 * each further affiliation, then your last affiliation and your city.
 *
 * `affiliation` is a list because a cross-appointment is a list. With one entry
 * it collapses to a single line; nothing here assumes a single employer.
 */
function affiliationBlock(profile) {
  const labels = (profile.affiliation ?? []).map((a) => (typeof a === "string" ? a : a.label));
  if (!labels.length) return [profile.headline, profile.place].filter(Boolean).join(", ");
  if (labels.length === 1) return [profile.headline, labels[0], profile.place].filter(Boolean).join(", ");
  return [
    [profile.headline, labels[0]].filter(Boolean).join(", "),
    ...labels.slice(1, -1).map((l) => `${l},`),
    [labels.at(-1), profile.place].filter(Boolean).join(", "),
  ].join(" \\\\\n");
}

// -----------------------------------------------------------------------------
// Renderers
// -----------------------------------------------------------------------------

const BANNER = [
  "% =============================================================================",
  "% GENERATED FILE - DO NOT EDIT.",
  "%",
  "% Produced by `node scripts/build-cv-data.mjs` from `content/cv.yaml`.",
  "% Edit cv.yaml and regenerate; hand edits here are overwritten and CI rejects",
  "% them (the workflow fails if this file is stale relative to cv.yaml).",
  "%",
  "% This file holds CONTENT ONLY. Layout, spacing and styling live in cv/preamble.tex.",
  "% =============================================================================",
  "",
];

function render(cv) {
  const p = cv.profile ?? {};
  const blocks = [
    macro("cvName", escapeLatex(p.name ?? "")),
    macro("cvContactLine", contactLine(p)),
    macro("cvProfilesLine", profilesLine(p.links)),
    macro("cvAffiliation", affiliationBlock(p)),
    macro("cvShortBio", renderInline(p.bio?.short)),
    macro("cvFocus", renderInline(p.focus)),
    macro("cvFooter", renderInline(p.footer)),
  ];
  // Every other top-level list is a section. Six macros each, plus its line of
  // the printed section sequence and, where the record opts out, one more macro.
  // All mechanical: the generator has no idea what any of them mean.
  //
  // Each entry of \cv<Name> is wrapped in `\ifnum<n>>\cvmax`, which is how a
  // variant prints only the first few of a section. How many is a page-budget
  // decision belonging to one document, so the number lives in the layout
  // (`\cvpart`'s optional argument, cv/preamble.tex) and never in cv.yaml. The
  // guard is expansion-level and opens no group, so at the default \cvmax the
  // typeset result is unchanged.
  //
  // WHICH sections print is the record's call (`printed:`), HOW MANY of one a
  // given document prints is that document's (`\cvpart`'s optional count). The
  // two are independent and both are honoured.
  const printed = [];
  for (const [key, value] of Object.entries(cv)) {
    if (key === "profile") continue;
    if (Array.isArray(value?.sections)) {
      blocks.push(`\\newcommand{\\cv${macroName(key)}Count}{${bibFileEntryCount(key)}}`, ...bibSections(key, value));
      continue;
    }
    const rows = Array.isArray(value) ? value : value?.entries;
    if (!Array.isArray(rows)) continue;
    const note = Array.isArray(value) ? [] : [value.note ?? []].flat();
    const name = macroName(key);
    blocks.push(
      macro(`cv${name}Note`, note.map(renderInline).join("\n\\cvnotesep\n")),
      macro(`cv${name}`, rows.map((r, i) => `\\ifnum${i + 1}>\\cvmax\\else\n${entry(r)}\n\\fi`).join("\n\n")),
      macro(`cv${name}Rows`, rows.length ? tableRows(rows, false) : ""),
      macro(`cv${name}Header`, rows.length ? tableHeader(rows, false, headingCase) : ""),
      macro(`cv${name}Inline`, rows.map((r) => arg(r.detail ? `${r.title} (${r.detail})` : r.title)).join(", ")),
      `\\newcommand{\\cv${name}Count}{${rows.length}}`
    );
    // `printed: false` is the record's own opt-out, so it holds wherever the
    // section is set: cv.tex defaults \cv<Key>Printed to 1 and guards on it.
    if (!Array.isArray(value) && value.printed === false) {
      blocks.push(`\\newcommand{\\cv${name}Printed}{0}`);
    }
    printed.push(`\\cvautopart{${sectionHeading(key, value)}}{${name}}`);
  }
  // The printed CV's section sequence, in the order content/cv.yaml writes it.
  // cv.tex prints this list and skips every key it has already laid out by hand,
  // so a section added to the record needs no LaTeX edit to appear.
  blocks.push(macro("cvAutoSections", printed.join("%\n")));
  return `${BANNER.join("\n")}\n${blocks.join("\n\n")}\n`;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function loadYaml(path) {
  return load(readFileSync(path, "utf8"));
}

function main() {
  const check = process.argv.includes("--check");
  const cv = loadYaml(CV_YAML);
  const publicTex = render(cv);
  const rel = (p) => relative(ROOT, p);

  if (check) {
    if (!existsSync(OUT_PUBLIC)) {
      console.error(`${rel(OUT_PUBLIC)} is missing. Run: node scripts/build-cv-data.mjs`);
      process.exit(1);
    }
    if (readFileSync(OUT_PUBLIC, "utf8") !== publicTex) {
      console.error(`${rel(OUT_PUBLIC)} is stale relative to ${rel(CV_YAML)}.`);
      console.error("Run `node scripts/build-cv-data.mjs` and commit the result.");
      process.exit(1);
    }
    console.log(`${rel(OUT_PUBLIC)} is up to date with ${rel(CV_YAML)}.`);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PUBLIC, publicTex);
  console.log(`wrote ${rel(OUT_PUBLIC)}`);
}

export {
  renderInline,
  where,
  editions,
  affiliationBlock,
  profilesLine,
  macroName,
  sectionHeading,
  tableHeader,
  entry,
  bibFilter,
  bibPrefix,
  bibSections,
  bibEntryCount,
  render,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
