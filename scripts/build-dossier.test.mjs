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
assert.deepEqual(keys, [
  "stan_jair2026b",
  "stan_jair2026",
  "DBLP:journals/ai/Munoz-VelascoPS19",
  "DBLP:journals/artmed/ManzellaPSS23",
  "DBLP:journals/fss/ConradieMMSS23",
  "DBLP:conf/ecai/ManzellaPSS23",
  "DBLP:journals/iandc/PagliariniSSSS24",
  "stan_array2026",
  "DBLP:journals/algorithms/Lucena-SanchezS21",
  "10.1115/1.4056287",
  "DBLP:conf/time/SciaviccoS20",
  "DBLP:conf/time/BellodiCPSS25",
]);
assert.deepEqual(spec.attachments, [
  "Domanda di partecipazione (Allegato A)",
  "Copia del codice fiscale",
  "Copia di un documento d'identità in corso di validità",
  "Curriculum scientifico, datato e firmato",
  "Elenco dei titoli, datato e firmato",
  "Dichiarazione sostitutiva di certificazione relativa ai titoli (Allegato B)",
  "Elenco numerato delle pubblicazioni presentate, datato e firmato",
  "Pubblicazioni presentate: n. 12 file PDF, numerati da 01 a 12 nell'ordine dell'elenco",
  "Abstract in lingua italiana delle pubblicazioni presentate",
  "Dichiarazione sostitutiva dell'atto di notorietà sulla conformità all'originale delle copie (Allegato C)",
  'Tesi di dottorato "Foundations of Modal Symbolic Learning" (Università degli Studi di Parma, 2023), file PDF',
  "Elenco di tutti i documenti allegati alla domanda",
]);

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
  const attachments = readFileSync(join(output, "attachments.tex"), "utf8");
  assert.match(attachments, /\\char"27\{\}/);
  assert.match(attachments, /\\textquotedblleft\{\}Foundations of Modal Symbolic Learning\\textquotedblright/);
  assert.match(titles, /Foundations of Modal Symbolic Learning/);
  const invited = titles.slice(titles.indexOf("Relazioni su invito"), titles.indexOf("Presentazioni orali"));
  const oral = titles.slice(titles.indexOf("Presentazioni orali"), titles.indexOf("Poster}"));
  const poster = titles.slice(titles.indexOf("Poster}"));
  assert.match(invited, /NLP meets Modal Logic/);
  assert.doesNotMatch(invited, /Fitting.s Style/);
  assert.match(oral, /Fitting.s Style/);
  assert.doesNotMatch(oral, /Evolutionary Explainable/);
  assert.match(poster, /Evolutionary Explainable Rule Extraction/);
  assert.match(poster, /Kraków, Poland, 2023-10-04/);
  const cilc = titles.slice(titles.indexOf("Implementation of a Tableau-based Satisfiability Checker"));
  assert.match(cilc, /32nd Italian Conference on Computational Logic, CILC 2017, Naples, Italy, 2017-09-27/);
  assert.equal((cilc.match(/Naples, Italy/g) || []).length, 1);
  assert.doesNotMatch(cilc, /September 26-28, 2017/);
  assert.match(readFileSync(join(output, "publications.tex"), "utf8"), /\\finalnamedelim/);
  assert.match(readFileSync(join(output, "publications.tex"), "utf8"), /\\DeclareFieldFormat\{eid\}\{Article~#1\}/);
  assert.match(readFileSync(join(output, "publications.tex"), "utf8"), /\\DeclareFieldFormat\{issn\}\{\}/);
  assert.match(readFileSync(join(output, "publications.tex"), "utf8"), /\\renewbibmacro\*\{journal\+issuetitle\}/);
  const pubTex = readFileSync(join(output, "publications.tex"), "utf8");
  assert.ok(pubTex.indexOf("\\usebibmacro{issue+date}") < pubTex.indexOf("\\printfield{eid}"));
  const overridden = run(["--place", "Roma", "--date", "2026-10-02", "--reviewed", "true"]);
  assert.equal(overridden.status, 0, overridden.stderr);
  const overriddenTitles = readFileSync(join(output, "titles.tex"), "utf8");
  const overriddenCv = readFileSync(join(output, "cv.tex"), "utf8");
  assert.match(overriddenTitles, /textitalian{Luogo e data:}} Roma, 2026-10-02/);
  assert.doesNotMatch(overriddenTitles, /BOZZA/);
  const cvEnding = overriddenCv.slice(overriddenCv.lastIndexOf("\\end{document}") - 200);
  assert.match(cvEnding, /Luogo e data:} Roma, 2026-10-02/);
  assert.equal(load(readFileSync(join(root, "content/dossier.yaml"), "utf8")).place, "");
  assert.equal(run(["--reviewed", "yes"]).status, 1);

  const temp = mkdtempSync(join(tmpdir(), "dossier-abstracts-"));
  const source = join(temp, "abstracts.yaml");
  writeFileSync(
    source,
    JSON.stringify({
      status: "verified-final",
      abstracts: keys.map((bibkey, i) => ({ position: i + 1, bibkey, abstract_it: `Contesto: traduzione ${i + 1}.` })),
    })
  );
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
