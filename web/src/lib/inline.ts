/**
 * The portable prose grammar `content/cv.yaml` uses: `**bold**`, `_italic_`,
 * `[text](url)`. Without this the asterisks print on the page.
 *
 * The pattern is the one at `scripts/build-cv-data.mjs`'s `MARKUP`, so the two
 * renderers of the same file agree on what the markup means. Two rules that
 * grammar already settled and that this must match: an underscore with a word
 * character on both sides (`a_b`, `snake_case`, `file_name.txt`) is literal, and
 * a bare `*` passes through so "CORE Rank: A*" survives.
 *
 * No Markdown dependency: this is one regex, and the LaTeX generator throws on
 * unbalanced markup with CI running it, so malformed markup reaches neither
 * renderer. Text is escaped before it is emitted, and a URL is escaped into its
 * attribute, so nothing in the YAML can inject markup of its own.
 */
const W = 'A-Za-z0-9';
const MARKUP = String.raw`\*\*([\s\S]+?)\*\*|(?<![${W}])_(?=[^\s_])([^_\n]+?)(?<=[^\s_])_(?![${W}])|\[([^\]\n]+)\]\(([^)\s]+)\)`;

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inline(text: string | undefined): string {
  const source = String(text ?? '');
  // A fresh matcher per call: `inline` recurses, and a shared regex's lastIndex
  // would be reset by the inner call and restart the outer scan.
  const pattern = new RegExp(MARKUP, 'g');
  let out = '';
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    out += escape(source.slice(last, match.index));
    if (match[1] !== undefined) out += `<b>${inline(match[1])}</b>`;
    else if (match[2] !== undefined) out += `<i>${inline(match[2])}</i>`;
    else out += `<a href="${escape(match[4])}">${inline(match[3])}</a>`;
    last = match.index + match[0].length;
  }
  return out + escape(source.slice(last));
}
