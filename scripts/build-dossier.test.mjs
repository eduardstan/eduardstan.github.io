import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { load } from "js-yaml";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts/build-dossier.mjs");
const run = (args = []) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
const spec = load(readFileSync(join(root, "content/dossier.yaml"), "utf8"));
const keys = spec.publications;

test("renders from the dossier declaration and refuses bad publication selections", () => {
  const built = run();
  assert.equal(built.status, 0, built.stderr);
  assert.match(built.stdout, /12 publication entries/);
  const abstractsTex = join(root, "cv/dossier-build/abstracts-it.tex");
  if (existsSync(spec.abstracts_path)) {
    const abstracts = readFileSync(abstractsTex, "utf8");
    assert.match(abstracts, /\\citetitle/);
    assert.doesNotMatch(abstracts, /Background:|Objectives:|Methods:|Results:|Conclusions:/);
  } else {
    assert.equal(existsSync(abstractsTex), false);
  }
  assert.match(readFileSync(join(root, "cv/dossier-build/titles.tex"), "utf8"), /Luogo e data.*\\rule/);
  assert.match(readFileSync(join(root, "cv/dossier-build/titles.tex"), "utf8"), /BOZZA/);
  assert.match(readFileSync(join(root, "cv/dossier-build/titles.tex"), "utf8"), /\\item \\textbf\{/);
  assert.equal(run(["--check-keys", `${keys[0]},${keys[0]}`]).status, 1);
  assert.equal(run(["--check-keys", "not-a-real-bib-key"]).status, 1);
  assert.equal(run(["--check-keys", Array.from({ length: 13 }, (_, i) => `key${i}`).join(",")]).status, 1);
});
