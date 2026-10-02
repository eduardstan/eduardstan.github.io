import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith('.html') ? [path] : [];
  });
}

test('built site HTML contains no JavaScript object-coercion leak', () => {
  const files = htmlFiles(dist);
  assert.ok(files.length, 'Astro build produced no HTML files');
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /\[object Object\]/, file);
  }
});
