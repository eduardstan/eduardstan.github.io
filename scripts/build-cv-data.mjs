#!/usr/bin/env node
// =============================================================================
// build-cv-data.mjs - render cv/cv.yaml into LaTeX content macros.
//
//   node scripts/build-cv-data.mjs            regenerate the .tex files
//   node scripts/build-cv-data.mjs --check    fail if the committed file is stale
//
// Outputs
//   cv/generated/cv-data.tex             public, COMMITTED, checked for staleness
//   cv/generated/cv-contact-private.tex  private overlay, gitignored, written only
//                                        when cv/private.yaml is present
//
// cv.tex owns layout; this script owns nothing but the mapping from facts to
// content macros. It never invents, reorders or rewords anything in cv.yaml.
// =============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CV_YAML = join(ROOT, 'cv', 'cv.yaml');
const PRIVATE_YAML = join(ROOT, 'cv', 'private.yaml');
const OUT_DIR = join(ROOT, 'cv', 'generated');
const OUT_PUBLIC = join(OUT_DIR, 'cv-data.tex');
const OUT_PRIVATE = join(OUT_DIR, 'cv-contact-private.tex');

// -----------------------------------------------------------------------------
// LaTeX escaping
// -----------------------------------------------------------------------------

const ESCAPES = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

// Characters the captain writes as real Unicode because they carry typographic
// meaning. Applied after escaping, so their replacements are emitted verbatim.
const TYPOGRAPHY = [
  ['—', '---'], // em dash
  ['–', '--'], // en dash
  ['‑', '{-}'], // non-breaking hyphen: suppress the line break here
  ['⁺', '$^{+}$'], // superscript plus, e.g. Erasmus+
  ['€', '\\euro{}'], // euro sign
];

/** Escape every LaTeX special, then map the typographic Unicode characters. */
function escapeLatex(text) {
  let out = String(text).replace(/[\\&%$#_{}~^]/g, (c) => ESCAPES[c]);
  for (const [from, to] of TYPOGRAPHY) out = out.split(from).join(to);
  return out;
}

/**
 * Escape a URL for the first argument of \href. hyperref reads it almost
 * verbatim, so only the characters TeX itself consumes need handling.
 */
function escapeUrl(url) {
  return String(url).replace(/\\/g, '\\\\').replace(/([%#])/g, '\\$1');
}

// -----------------------------------------------------------------------------
// Inline markup: **bold**, _italic_, [text](url)
//
// Markup is tokenised BEFORE escaping so that a URL is never mangled and so that
// the `_` of _italic_ is not turned into \_. A bare `*` is left alone, which
// keeps "CORE Rank: A*" safe.
// -----------------------------------------------------------------------------

const MARKUP = String.raw`\*\*([\s\S]+?)\*\*|_([^_\n]+?)_|\[([^\]\n]+)\]\(([^)\s]+)\)`;

function renderInline(text) {
  const src = String(text ?? '');
  // A fresh matcher per call: renderInline recurses, and a shared regex's
  // lastIndex would be reset by the inner call and restart the outer scan.
  const re = new RegExp(MARKUP, 'g');
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    out += escapeLatex(src.slice(last, m.index));
    if (m[1] !== undefined) out += `\\textbf{${renderInline(m[1])}}`;
    else if (m[2] !== undefined) out += `\\emph{${renderInline(m[2])}}`;
    else out += `\\href{${escapeUrl(m[4])}}{${renderInline(m[3])}}`;
    last = m.index + m[0].length;
  }
  return out + escapeLatex(src.slice(last));
}

/** Render a value that must survive as a LaTeX macro argument (never empty-unsafe). */
const arg = (value) => renderInline(value ?? '');

// -----------------------------------------------------------------------------
// Building blocks shared by several sections
// -----------------------------------------------------------------------------

/** `\resumeItemListStart ... \resumeItemListEnd`, or nothing when there are no items. */
function itemList(items) {
  if (!items || !items.length) return '';
  const body = items.map((i) => `  \\item ${renderInline(i)}`).join('\n');
  return `\\resumeItemListStart\n${body}\n\\resumeItemListEnd`;
}

/** One `\resumeSubheading` (+ optional bullets). */
function subheading({ title, location, organisation, dates, items }) {
  const head = `\\resumeSubheading\n  {${arg(title)}}{${arg(location)}}\n  {${arg(organisation)}}{${arg(dates)}}`;
  const list = itemList(items);
  return list ? `${head}\n${list}` : head;
}

/** One `\resumeProject` (+ optional bullets). */
function project({ title, detail, dates, items }) {
  const head = `\\resumeProject\n  {${arg(title)}}\n  {${arg(detail)}}\n  {${arg(dates)}}\n  {}`;
  const list = itemList(items);
  return list ? `${head}\n${list}` : head;
}

/** A table body: one `a & b & c \\` line per row. */
function tableRows(rows, fields) {
  return rows.map((r) => `${fields.map((f) => arg(r[f])).join(' & ')} \\\\`).join('\n');
}

function macro(name, body) {
  return `\\newcommand{\\${name}}{%\n${body}%\n}`;
}

// -----------------------------------------------------------------------------
// Contact line
// -----------------------------------------------------------------------------

const mailto = (address) => `\\href{mailto:${escapeUrl(address)}}{${escapeLatex(address)}}`;

/**
 * Build the header contact line. `priv` is the parsed private.yaml contact block
 * or null; when null the mobile and personal address are simply not emitted.
 */
function contactLine(contact, priv) {
  const parts = [];
  if (priv?.mobile) parts.push(escapeLatex(priv.mobile));
  if (contact.email) parts.push(mailto(contact.email));
  if (priv?.personal_email) parts.push(mailto(priv.personal_email));
  if (contact.website) {
    parts.push(`\\href{${escapeUrl(contact.website.url)}}{${escapeLatex(contact.website.label)}}`);
  }
  return parts.join('\n\\;|\\;\n');
}

function profilesLine(profiles) {
  return profiles
    .map((p) => {
      if (!/^[a-z]+$/.test(p.kind)) {
        throw new Error(`contact.profiles: kind "${p.kind}" must be lowercase letters only ` + `(it selects the \\cvicon<kind> macro defined in cv.tex)`);
      }
      return `\\cvicon${p.kind}\\,\\href{${escapeUrl(p.url)}}{${escapeLatex(p.label)}}`;
    })
    .join('\n\\;|\\;\n');
}

// -----------------------------------------------------------------------------
// Renderers
// -----------------------------------------------------------------------------

const BANNER = [
  '% =============================================================================',
  '% GENERATED FILE - DO NOT EDIT.',
  '%',
  '% Produced by `node scripts/build-cv-data.mjs` from `cv/cv.yaml`.',
  '% Edit cv.yaml and regenerate; hand edits here are overwritten and CI rejects',
  '% them (the workflow fails if this file is stale relative to cv.yaml).',
  '%',
  '% This file holds CONTENT ONLY. Layout, spacing and styling live in cv/cv.tex.',
  '% =============================================================================',
  '',
];

function renderPublic(cv) {
  const t = cv.teaching;
  const blocks = [
    macro('cvName', escapeLatex(cv.person.name)),
    macro('cvContactLine', contactLine(cv.contact, null)),
    macro('cvProfilesLine', profilesLine(cv.contact.profiles)),
    macro('cvAffiliation', cv.contact.affiliation.map(escapeLatex).join(' \\\\\n')),

    macro('cvShortBio', renderInline(cv.short_bio)),
    macro('cvResearchFocus', renderInline(cv.research_focus)),

    macro('cvAppointments', cv.appointments.map((a) => subheading({ ...a, title: a.role })).join('\n')),
    macro('cvEducation', cv.education.map((e) => subheading({ title: e.degree, location: e.location, organisation: e.institution, dates: e.dates })).join('\n')),

    macro('cvTeachingUnimibHeading', subheading({ title: t.unimib.role, location: t.unimib.location, organisation: t.unimib.organisation, dates: t.unimib.dates })),
    macro('cvTeachingUnimibRows', tableRows(t.unimib.courses, ['course', 'programme', 'topics', 'hours'])),
    macro('cvTeachingAcademyHeading', subheading({ title: t.academy.role, location: t.academy.location, organisation: t.academy.organisation, dates: t.academy.dates })),
    macro('cvTeachingAcademyRows', tableRows(t.academy.courses, ['course', 'programme', 'topics', 'hours'])),
    macro('cvTeachingUnifeHeading', subheading({ title: t.unife.role, location: t.unife.location, organisation: t.unife.organisation, dates: t.unife.dates })),
    macro('cvTeachingUnifeRows', tableRows(t.unife.courses, ['course', 'programme', 'topics', 'hours'])),

    macro('cvService', cv.service.map((s) => project({ title: s.role, detail: s.detail, dates: s.dates, items: s.items })).join('\n\n')),
    macro('cvProjects', cv.projects.map((p) => project(p)).join('\n\n')),
    macro('cvAwards', cv.awards.map((a) => project(a)).join('\n\n')),

    macro('cvSupervisionSummary', renderInline(cv.supervision.summary)),
    macro('cvSupervisionTopics', renderInline(cv.supervision.topic_coverage)),
    macro('cvSupervisionRows', tableRows(cv.supervision.breakdown, ['level', 'count', 'notes'])),

    macro('cvLanguages', cv.languages.map((l) => `${escapeLatex(l.name)} (${escapeLatex(l.level)})`).join(', ')),

    macro('cvDataProtectionHeading', renderInline(cv.data_protection.heading)),
    macro('cvDataProtectionText', renderInline(cv.data_protection.text)),
  ];
  return `${BANNER.join('\n')}\n${blocks.join('\n\n')}\n`;
}

function renderPrivateOverlay(cv, priv) {
  return [
    '% =============================================================================',
    '% GENERATED FILE - DO NOT EDIT, DO NOT COMMIT.',
    '%',
    '% Private contact overlay, produced from cv/private.yaml. Gitignored.',
    '% cv.tex inputs it only if it exists, so a checkout without cv/private.yaml',
    '% builds the public CV with institutional contact only.',
    '% =============================================================================',
    '',
    `\\renewcommand{\\cvContactLine}{%\n${contactLine(cv.contact, priv)}%\n}`,
    '',
  ].join('\n');
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function loadYaml(path) {
  return load(readFileSync(path, 'utf8'));
}

function main() {
  const check = process.argv.includes('--check');
  const cv = loadYaml(CV_YAML);
  const publicTex = renderPublic(cv);
  const rel = (p) => relative(ROOT, p);

  if (check) {
    if (!existsSync(OUT_PUBLIC)) {
      console.error(`${rel(OUT_PUBLIC)} is missing. Run: node scripts/build-cv-data.mjs`);
      process.exit(1);
    }
    if (readFileSync(OUT_PUBLIC, 'utf8') !== publicTex) {
      console.error(`${rel(OUT_PUBLIC)} is stale relative to ${rel(CV_YAML)}.`);
      console.error('Run `node scripts/build-cv-data.mjs` and commit the result.');
      process.exit(1);
    }
    console.log(`${rel(OUT_PUBLIC)} is up to date with ${rel(CV_YAML)}.`);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PUBLIC, publicTex);
  console.log(`wrote ${rel(OUT_PUBLIC)}`);

  if (existsSync(PRIVATE_YAML)) {
    const priv = loadYaml(PRIVATE_YAML)?.contact ?? {};
    writeFileSync(OUT_PRIVATE, renderPrivateOverlay(cv, priv));
    console.log(`wrote ${rel(OUT_PRIVATE)} (private contact merged in)`);
  } else if (existsSync(OUT_PRIVATE)) {
    // No private.yaml: drop the stale overlay so it cannot silently override.
    rmSync(OUT_PRIVATE);
    console.log(`removed stale ${rel(OUT_PRIVATE)} (no cv/private.yaml)`);
  } else {
    console.log('no cv/private.yaml - public contact only');
  }
}

main();
