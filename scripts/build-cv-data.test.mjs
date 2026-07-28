// Inline-markup rules for cv.yaml prose.
// Run: node --test scripts/build-cv-data.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderInline, serviceDetail } from "./build-cv-data.mjs";

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

test("service details recompose sections, year ranges and metrics", () => {
  assert.equal(
    serviceDetail({
      venue: "Frontiers in Artificial Intelligence Journal",
      section: "Pattern Recognition Section",
      metric: "IF: 4.7, Q2",
    }),
    "Frontiers in Artificial Intelligence Journal, Pattern Recognition Section **[IF: 4.7, Q2]**"
  );
  assert.equal(
    serviceDetail({
      venue: "International Joint Conference on Neural Networks (IJCNN)",
      metric: "CORE Rank: B",
      years: [{ year: 2025, announced: "2025-01-11" }, { year: 2026 }],
    }),
    "International Joint Conference on Neural Networks (IJCNN), 2025–2026 **[CORE Rank: B]**"
  );
});

test("sparse service details do not print stray separators", () => {
  assert.equal(
    serviceDetail({
      venue: "IEEE International Conference on Intelligent Reality (ICIR)",
      years: [{ year: 2026 }],
    }),
    "IEEE International Conference on Intelligent Reality (ICIR), 2026"
  );
  assert.equal(serviceDetail({ venue: "PeerJ Computer Science Journal", metric: "IF: 2.5; Q1" }), "PeerJ Computer Science Journal **[IF: 2.5; Q1]**");
});
