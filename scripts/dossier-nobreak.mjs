// Keep uppercase acronyms and ISO dates intact at line endings in dossier documents.
export function protectNoBreak(text) {
  return String(text ?? "").replace(
    /(?<![A-Za-z0-9])(?:[A-Z]{2,}(?:-[0-9]+)?[0-9]*s?|[0-9]{4}-[0-9]{2}-[0-9]{2})(?![A-Za-z0-9])/g,
    (match) => `\\mbox{${match}}`
  );
}

// Protect only BibTeX field values; entry keys and field names stay untouched.
export function protectBibtexValues(source) {
  const text = String(source);
  const chunks = [];
  const textFields = new Set([
    "title",
    "subtitle",
    "booktitle",
    "journal",
    "journaltitle",
    "series",
    "organization",
    "publisher",
    "note",
    "venue",
    "eventtitle",
    "location",
    "institution",
    "date",
    "year",
  ]);
  let copied = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "=") continue;
    let start = i + 1;
    while (/\s/.test(text[start] ?? "")) start++;
    const opener = text[start];
    const fieldStart = Math.max(text.lastIndexOf("\n", i), text.lastIndexOf(",", i), text.lastIndexOf("{", i)) + 1;
    const field = /([\w-]+)\s*$/.exec(text.slice(fieldStart, i))?.[1]?.toLowerCase();
    const transform = textFields.has(field);
    let end;
    if (opener === "{") {
      let depth = 1;
      end = start + 1;
      for (; end < text.length && depth; end++) {
        if (text[end] === "{") depth++;
        if (text[end] === "}") depth--;
      }
      end--;
      chunks.push(text.slice(copied, start + 1), transform ? protectNoBreak(text.slice(start + 1, end)) : text.slice(start + 1, end));
      copied = end;
      i = end - 1;
    } else if (opener === '"') {
      end = start + 1;
      while (end < text.length && (text[end] !== '"' || text[end - 1] === "\\")) end++;
      chunks.push(text.slice(copied, start + 1), transform ? protectNoBreak(text.slice(start + 1, end)) : text.slice(start + 1, end));
      copied = end;
      i = end;
    }
  }
  chunks.push(text.slice(copied));
  return chunks.join("");
}
