import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentsPath = path.join(repositoryRoot, "AGENTS.md");

function repositoryPaths(markdown) {
  const codeSpans = [...markdown.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]);
  const rootFile = /^(?:[^/.][^/]*\.(?:md|ya?ml|json|mjs|cjs|js|ts|tsx|astro|tex|bib)|\.gitignore|\.prettierrc|LICENSE)$/;

  return [
    ...new Set(
      codeSpans.filter(
        (value) =>
          !value.startsWith("/") &&
          !value.includes(" ") &&
          !value.includes("\\") &&
          !/[[\]()*?:]/.test(value) &&
          (value.includes("/") || rootFile.test(value))
      )
    ),
  ];
}

test("every repository path in AGENTS.md exists", () => {
  const paths = repositoryPaths(readFileSync(agentsPath, "utf8"));
  const missing = paths.filter((relativePath) => !existsSync(path.join(repositoryRoot, relativePath)));

  assert.deepEqual(missing, [], `Missing paths mentioned in AGENTS.md: ${missing.join(", ")}`);
});
