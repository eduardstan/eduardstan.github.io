import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { load } from "js-yaml";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts/build-dossier.mjs");
const environment = { ...process.env };
delete environment.DOSSIER_ABSTRACTS;
const run = (args = [], env = environment) => spawnSync(process.execPath, [script, ...args], { cwd: root, env, encoding: "utf8" });
const spec = load(readFileSync(join(root, "content/dossier.yaml"), "utf8"));
const keys = spec.publications;

test("renders the declaration, optional translations, and rejects bad publication selections", () => {
  const withoutAbstracts = run();
  assert.equal(withoutAbstracts.status, 0, withoutAbstracts.stderr);
  assert.match(withoutAbstracts.stdout, /Italian abstracts skipped: pass --abstracts <path> or set DOSSIER_ABSTRACTS/);
  const output = join(root, "cv/dossier-build");
  assert.equal(existsSync(join(output, "abstracts-it.tex")), false);
  const titles = readFileSync(join(output, "titles.tex"), "utf8");
  assert.match(withoutAbstracts.stdout, /12 publication entries/);
  assert.match(titles, /Luogo e data.*\\rule/);
  assert.match(titles, /BOZZA/);
  assert.match(titles, /\\item \\textbf\{/);
  assert.match(titles, /Foundations of Modal Symbolic Learning/);
  assert.match(readFileSync(join(output, "publications.tex"), "utf8"), /\\finalnamedelim/);

  const temp = mkdtempSync(join(tmpdir(), "dossier-abstracts-"));
  const source = join(temp, "abstracts.yaml");
  writeFileSync(source, JSON.stringify(keys.map((bibkey, i) => ({ position: i + 1, bibkey, abstract_it: `Contesto: traduzione ${i + 1}.` }))));
  try {
    const fromCli = run(["--abstracts", source]);
    assert.equal(fromCli.status, 0, fromCli.stderr);
    const abstracts = readFileSync(join(output, "abstracts-it.tex"), "utf8");
    assert.match(abstracts, /\\citetitle/);
    assert.match(abstracts, /\\finalnamedelim/);
    assert.doesNotMatch(abstracts, /Background:|Objectives:|Methods:|Results:|Conclusions:/);
    assert.ok(abstracts.indexOf("traduzione 1") < abstracts.indexOf("traduzione 2"));

    const fromEnv = run([], { ...environment, DOSSIER_ABSTRACTS: source });
    assert.equal(fromEnv.status, 0, fromEnv.stderr);
    assert.ok(existsSync(join(output, "abstracts-it.tex")));
    assert.equal(run(["--abstracts", join(temp, "missing.yaml")]).status, 1);
  } finally {
    rmSync(temp, { recursive: true, force: true });
    const cleanup = run();
    assert.equal(cleanup.status, 0, cleanup.stderr);
  }

  assert.equal(run(["--check-keys", `${keys[0]},${keys[0]}`]).status, 1);
  assert.equal(run(["--check-keys", "not-a-real-bib-key"]).status, 1);
  assert.equal(run(["--check-keys", Array.from({ length: 13 }, (_, i) => `key${i}`).join(",")]).status, 1);
});
