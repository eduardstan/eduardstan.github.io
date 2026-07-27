// Inline-markup rules for cv.yaml prose.
// Run: node --test scripts/build-cv-data.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderInline } from './build-cv-data.mjs';

test('an underscore inside a word stays literal and does not open a span', () => {
  // The probe that exposed the bug: a_b used to pair with the opener of
  // _italic_ and italicise everything between them.
  assert.equal(renderInline('a_b and _italic_'), 'a\\_b and \\emph{italic}');
  assert.equal(renderInline('see file_name.txt in snake_case'), 'see file\\_name.txt in snake\\_case');
});

test('bold, links and a bare asterisk are unchanged', () => {
  assert.equal(renderInline('**bold**'), '\\textbf{bold}');
  assert.equal(renderInline('CORE Rank: A*'), 'CORE Rank: A*');
  assert.equal(renderInline('[text](https://example.org/a_b?x=1&y=2)'), '\\href{https://example.org/a_b?x=1\\&y=2}{text}');
});

test('an unclosed emphasis marker raises instead of emitting wrong emphasis', () => {
  assert.throws(() => renderInline('_oops'), /unbalanced inline markup/);
  assert.throws(() => renderInline('**oops'), /unbalanced inline markup/);
});
