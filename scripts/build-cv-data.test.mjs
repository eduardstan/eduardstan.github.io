// Rendering rules for content/cv.yaml facts.
// Run: node --test scripts/build-cv-data.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { affiliationBlock, editions, macroName, profilesLine, renderInline, tableHeader, where } from "./build-cv-data.mjs";

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
