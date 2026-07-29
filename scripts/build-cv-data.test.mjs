// Rendering rules for content/cv.yaml facts.
// Run: node --test scripts/build-cv-data.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  affiliationBlock,
  bibFilter,
  bibPrefix,
  bibSections,
  editions,
  entry,
  macroName,
  profilesLine,
  renderInline,
  tableHeader,
  where,
} from "./build-cv-data.mjs";

test("an underscore inside a word stays literal and does not open a span", () => {
  // The probe that exposed the bug: a_b used to pair with the opener of
  // _italic_ and italicise everything between them.
  assert.equal(renderInline("a_b and _italic_"), "a\\_b and \\emph{italic}");
  assert.equal(renderInline("see file_name.txt in snake_case"), "see file\\_name.txt in snake\\_case");
});

test("bold, links and a bare asterisk are unchanged", () => {
  assert.equal(renderInline("**bold**"), "\\textbf{bold}");
  assert.equal(renderInline("CORE Rank: A*"), "CORE Rank: A*");
  assert.equal(renderInline("[text](https://example.org/a-b?x=1&y=2)"), "\\href{https://example.org/a-b?x=1\\&y=2}{text}");
});

test("a URL carrying a character TeX consumes raises instead of mislinking", () => {
  assert.throws(() => renderInline("[text](https://example.org/~user)"), /unsafe character "~"/);
  assert.throws(() => renderInline("[text](https://example.org/a_b)"), /unsafe character "_"/);
});

test("an unclosed emphasis marker raises instead of emitting wrong emphasis", () => {
  assert.throws(() => renderInline("_oops"), /unbalanced inline markup/);
  assert.throws(() => renderInline("**oops"), /unbalanced inline markup/);
});

// -----------------------------------------------------------------------------
// One entry shape. `where()` builds the second line of EVERY section, so the
// cases below are one section each: an appointment states only `org`, a project
// only `detail`, a service role both plus its editions and its ranking.
// -----------------------------------------------------------------------------

test("one rule builds the second line of every section", () => {
  assert.equal(where({ title: "Assistant Professor (RTD/a)", org: "University of Milano-Bicocca (ISLab)" }), "University of Milano-Bicocca (ISLab)");
  assert.equal(
    where({ title: "ANTHEM", detail: "Collaborator (University of Milano-Bicocca, ISLab)" }),
    "Collaborator (University of Milano-Bicocca, ISLab)"
  );
  assert.equal(
    where({
      title: "Associate Editor",
      org: "Frontiers in Artificial Intelligence Journal",
      detail: "Pattern Recognition Section",
      metric: "IF: 4.7, Q2",
    }),
    "Frontiers in Artificial Intelligence Journal, Pattern Recognition Section **[IF: 4.7, Q2]**"
  );
  assert.equal(
    where({
      title: "Area Chair",
      org: "IEEE International Joint Conference on Neural Networks (IJCNN)",
      metric: "CORE Rank: B",
      years: [{ year: 2025, announced: "2025-01-11" }, 2026],
    }),
    "IEEE International Joint Conference on Neural Networks (IJCNN), 2025–2026 **[CORE Rank: B]**"
  );
});

test("a sparse entry does not print stray separators", () => {
  // Everything but `title` is optional, so the line is only ever one missing
  // field away from a comma with nothing on one side of it.
  assert.equal(where({ title: "Member" }), "");
  assert.equal(
    where({ title: "Reviewer", org: "PeerJ Computer Science Journal", metric: "IF: 2.5; Q1" }),
    "PeerJ Computer Science Journal **[IF: 2.5; Q1]**"
  );
  assert.equal(where({ title: "Co-Chair", org: "ICIR", years: [2026] }), "ICIR, 2026");
});

test("editions fold when consecutive and are listed when not", () => {
  assert.equal(editions([2024, 2025, 2026]), "2024–2026");
  assert.equal(editions([{ year: 2025, announced: "2024-08-28" }, { year: 2026 }]), "2025–2026");
  assert.equal(editions([2024, 2026]), "2024, 2026");
  assert.equal(editions([2026, 2025]), "2026, 2025");
  assert.equal(editions([2026]), "2026");
  assert.equal(editions(undefined), "");
});

// -----------------------------------------------------------------------------
// The header block
// -----------------------------------------------------------------------------

test("the address block collapses to one line for one affiliation", () => {
  assert.equal(
    affiliationBlock({
      headline: "Postdoctoral Researcher",
      affiliation: [{ label: "University of Somewhere" }],
      place: "Somewhere, Elsewhere",
    }),
    "Postdoctoral Researcher, University of Somewhere, Somewhere, Elsewhere"
  );
});

test("the address block sets several affiliations over several lines", () => {
  // `affiliation` is a list because a cross-appointment is a list; nothing here
  // assumes one employer.
  assert.equal(
    affiliationBlock({
      headline: "Assistant Professor (RTD/a)",
      affiliation: [{ label: "ISLab" }, { label: "DISCo" }, { label: "University of Milano-Bicocca" }],
      place: "Milan, 20125, Italy",
    }),
    "Assistant Professor (RTD/a), ISLab \\\\\nDISCo, \\\\\nUniversity of Milano-Bicocca, Milan, 20125, Italy"
  );
  // No affiliation at all is still a valid line rather than a stray comma.
  assert.equal(affiliationBlock({ headline: "Researcher", place: "Anywhere" }), "Researcher, Anywhere");
});

test("profile.links takes an ID and an unknown kind names its two edits", () => {
  assert.equal(profilesLine({ orcid: "0000-0002-1825-0097" }), "\\cviconorcid\\,\\href{https://orcid.org/0000-0002-1825-0097}{0000-0002-1825-0097}");
  // A blank ID is dropped rather than rendered as an empty link.
  assert.equal(profilesLine({ orcid: "", github: undefined }), "");
  assert.throws(() => profilesLine({ bluesky: "ada.example.com" }), /not a known account kind/);
  assert.throws(() => profilesLine({ bluesky: "ada.example.com" }), /cv\/cv\.tex/);
});

// -----------------------------------------------------------------------------
// Sections, which the generator knows nothing about
// -----------------------------------------------------------------------------

test("a section key becomes a legal macro name", () => {
  assert.equal(macroName("appointments"), "Appointments");
  assert.equal(macroName("field_work"), "FieldWork");
  assert.equal(macroName("teaching"), "Teaching");
});

test("a table's header is its own row keys, so renaming a key renames a column", () => {
  // The friction log's F12: an NZ adopter writes `points:` and the column says
  // "Points" without a LaTeX edit.
  assert.equal(tableHeader([{ course: "Databases", points: "18 points" }]), "\\textbf{Course} & \\textbf{Points} \\\\");
});

test("an empty or absent rows list emits no course table", () => {
  const withoutRows = entry({ title: "Lecturer" });
  const withEmptyRows = entry({ title: "Lecturer", rows: [] });
  assert.equal(withEmptyRows, withoutRows);
  assert.doesNotMatch(withEmptyRows, /\\cvcourses/);
});

// -----------------------------------------------------------------------------
// Bibliography sections. A section is a title plus a filter: which BibTeX entry
// type belongs under which heading is declared in content/cv.yaml, never here
// and never in cv/cv.tex.
// -----------------------------------------------------------------------------

test("a section's filter is any of types, all of keywords, none of the excluded", () => {
  assert.equal(bibFilter({ types: ["article"] }, "x"), "type=article");
  assert.equal(bibFilter({ types: ["incollection", "book"] }, "x"), "( type=incollection or type=book )");
  assert.equal(bibFilter({ types: ["inproceedings"], exclude_keywords: ["workshop"] }, "x"), "type=inproceedings and not keyword=workshop");
  assert.equal(bibFilter({ keywords: ["invited"] }, "x"), "keyword=invited");
});

test("every BibTeX entry type is expressible, including the ones nobody wrote a filter for", () => {
  // The point of the redesign: an adopter whose career is datasets or patents
  // declares a section and it works, with no LaTeX edit.
  assert.equal(bibFilter({ types: ["dataset", "patent"] }, "x"), "( type=dataset or type=patent )");
  assert.equal(bibFilter({ types: ["misc"] }, "x"), "type=misc");
});

test("a section with no filter raises rather than printing the whole bibliography", () => {
  assert.throws(() => bibFilter({ title: "Everything" }, "publications.sections[0]"), /at least one of/);
});

test("a filter token that is not a bare word raises before it reaches biblatex", () => {
  assert.throws(() => bibFilter({ types: ["in proceedings"] }, "x"), /not a usable BibTeX entry type/);
});

test("an entry type written in upper case raises instead of matching nothing anywhere", () => {
  // biber lowercases every entry type before testing a filter, and so does the
  // website's reader, so `type=Article` would select nothing on either side.
  assert.throws(() => bibFilter({ types: ["Article"] }, "x"), /must be written in lower case/);
});

test("the numbering letter defaults to the short name's first letter", () => {
  assert.equal(bibPrefix({ short: "Journal" }), "J");
  assert.equal(bibPrefix({ short: "Under review" }), "U");
  assert.equal(bibPrefix({ short: "Chapters", prefix: "B" }), "B");
});

test("declared sections become the key line and the printed sections, in file order", () => {
  const [filters, key, body] = bibSections("publications", {
    sections: [
      { title: "Journal articles", short: "Journal", types: ["article"] },
      { title: "Books & chapters", short: "Books", types: ["incollection"] },
    ],
  });
  assert.equal(
    filters,
    "\\defbibfilter{Publications1}{type=article}\n" + "\\defbibfilter{Publications2}{type=incollection and not ( type=article )}"
  );
  assert.match(key, /J=Journal, B=Books/);
  assert.match(body, /labelprefix=J[\s\S]*title=\{Journal articles\}, filter=Publications1/);
  // The heading is escaped on the way into LaTeX like every other prose field.
  assert.match(body, /title=\{Books \\& chapters\}, filter=Publications2/);
});

test("a section marked `printed: false` is named for the website and never printed", () => {
  const [filters, key, body] = bibSections("publications", {
    sections: [
      { title: "Journal articles", short: "Journal", types: ["article"] },
      { title: "Software & artifacts", short: "Software", types: ["misc"], printed: false },
    ],
  });
  assert.doesNotMatch(filters, /\\defbibfilter\{Publications2\}/);
  assert.doesNotMatch(key, /Software/);
  assert.doesNotMatch(body, /Software/);
});

test("a printed section's filter excludes every predicate declared before it", () => {
  // biblatex tests each filter on its own, so two filters that both accept an
  // entry both print it - while the website labels it with the FIRST section it
  // matches. Subtracting the earlier predicates is what makes the two agree.
  const [filters] = bibSections("publications", {
    sections: [
      { title: "Journal articles", short: "Journal", types: ["article"] },
      { title: "Conference papers", short: "Conference", types: ["inproceedings"], exclude_keywords: ["workshop"] },
      { title: "Workshop papers", short: "Workshop", types: ["inproceedings"], keywords: ["workshop"] },
    ],
  });
  assert.match(filters, /\{Publications1\}\{type=article\}/);
  assert.match(filters, /\{Publications2\}\{type=inproceedings and not keyword=workshop and not \( type=article \)\}/);
  assert.match(
    filters,
    /\{Publications3\}\{type=inproceedings and keyword=workshop and not \( type=article \) and not \( type=inproceedings and not keyword=workshop \)\}/
  );
});

test("an unprinted section still claims its entries, so the printed ones below it exclude it", () => {
  // `printed: false` names a group for the website. An entry the website files
  // there must not be printed again by a section declared after it.
  const [filters] = bibSections("publications", {
    sections: [
      { title: "Software & artifacts", short: "Software", types: ["misc"], printed: false },
      { title: "Everything else", short: "Other work", exclude_keywords: ["hidden"] },
    ],
  });
  assert.match(filters, /\{Publications2\}\{not keyword=hidden and not \( type=misc \)\}/);
});

test("an unprinted section is validated too, rather than relabelling the website in silence", () => {
  // A criteria-less section matches every entry. Placed first, it would take
  // the whole bibliography's Type column with it on the site while the PDF,
  // which never prints it, looked untouched.
  assert.throws(
    () =>
      bibSections("publications", {
        sections: [
          { title: "Everything", short: "Everything", printed: false },
          { title: "Journal articles", short: "Journal", types: ["article"] },
        ],
      }),
    /at least one of/
  );
  assert.throws(
    () =>
      bibSections("publications", {
        sections: [{ title: "Nameless", types: ["misc"], printed: false }],
      }),
    /needs both a title and a short name/
  );
});

test("two sections claiming the same numbering letter raise instead of colliding", () => {
  assert.throws(
    () =>
      bibSections("publications", {
        sections: [
          { title: "Conference papers", short: "Conference", types: ["inproceedings"] },
          { title: "Chapters", short: "Chapters", types: ["incollection"] },
        ],
      }),
    /already used by "Conference"/
  );
});
