import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentsPath = path.join(repositoryRoot, "AGENTS.md");
const siteRoutes = new Set([
  "/cv/",
  "/feed.xml",
  "/lately/",
  "/news/",
  "/professional_activities/",
  "/projects/",
  "/publications/",
  "/rss.xml",
  "/talks/",
]);

function repositoryPaths(markdown) {
  const codeSpans = [...markdown.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]);
  const rootFile = /^(?:[^/.][^/]*\.(?:md|ya?ml|json|mjs|cjs|js|ts|tsx|astro|tex|bib)|\.gitignore|\.prettierrc|LICENSE)$/;
  const paths = new Set();
  const invalid = new Set();

  for (const value of codeSpans) {
    if (siteRoutes.has(value)) continue;
    if (path.posix.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\")) {
      invalid.add(value);
      continue;
    }
    if (value.includes(" ") || value.includes("\\") || /[[\]()*?:]/.test(value) || (!value.includes("/") && !rootFile.test(value))) {
      continue;
    }

    const resolvedPath = path.resolve(repositoryRoot, value);
    if (resolvedPath !== repositoryRoot && !resolvedPath.startsWith(`${repositoryRoot}${path.sep}`)) {
      invalid.add(value);
      continue;
    }
    paths.add(value);
  }

  return { invalid: [...invalid], paths: [...paths] };
}

test("every repository path in AGENTS.md exists", () => {
  const { invalid, paths } = repositoryPaths(readFileSync(agentsPath, "utf8"));
  const missing = paths.filter((relativePath) => !existsSync(path.join(repositoryRoot, relativePath)));

  assert.deepEqual(invalid, [], `Paths in AGENTS.md must be repository-relative: ${invalid.join(", ")}`);
  assert.deepEqual(missing, [], `Missing paths mentioned in AGENTS.md: ${missing.join(", ")}`);
});

test("rejects absolute and repository-escaping paths while allowing site routes", () => {
  const { invalid, paths } = repositoryPaths("`/cv/` `/tmp/AGENTS.md` `C:\\checkout\\AGENTS.md` `../AGENTS.md` `web/README.md`");

  assert.deepEqual(invalid, ["/tmp/AGENTS.md", "C:\\checkout\\AGENTS.md", "../AGENTS.md"]);
  assert.deepEqual(paths, ["web/README.md"]);
});
