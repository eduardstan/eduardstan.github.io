/**
 * The three research strands.
 *
 * Unlike everything in `record.ts`, this copy is not read out of a repository
 * file — no file in this repository states a strand structure. It is therefore
 * the one piece of writing on the site that has to be approved rather than
 * derived, and it is kept here, alone, so that stays obvious.
 *
 * Two rules hold it in place:
 *
 * 1. **No hierarchy.** Three strands, equal weight, equal length, fixed order.
 *    Nothing in the copy or the CSS may promote one of them.
 * 2. **Evidence or silence.** Each strand names the repository files its claim
 *    rests on. Those paths are checked at build time (`strands()` below), and
 *    the inspect block reports which ones are actually present — including, for
 *    the agentic strand, that the record for it is thin. Where the evidence is
 *    thin the copy is short, rather than reaching.
 */
import { hasSource } from './record';

export interface Strand {
  title: string;
  body: string;
  /** Repository-relative paths that carry the evidence for this strand. */
  evidence: string[];
  /** Evidence paths that do not exist on this branch, reported when inspecting. */
  absent: string[];
}

const STRANDS: Omit<Strand, 'absent'>[] = [
  {
    title: 'Interpretable AI',
    body: 'Formal logic and symbolic AI used to make learned models inspectable: temporal decision trees and forests, rule extraction, and explanations that can be checked rather than taken on trust.',
    evidence: ['content/cv.yaml', 'content/publications.bib'],
  },
  {
    title: 'Temporal and logic methods',
    body: 'Modal and interval temporal logic as a learning language — tableau systems, fuzzy generalisations, model checking, and modal symbolic learning over time series, audio and sensor streams.',
    evidence: ['content/publications.bib'],
  },
  {
    title: 'Agentic AI',
    // Site-owner-approved wording, 2026-07-28. He rejected the earlier draft that
    // called this strand "continuous with" the 2020 multi-agent synthesis
    // project, because the CV does not draw that link. Do not reintroduce that
    // framing here or anywhere else on the site.
    body: 'Systems that plan and act, not only predict. Taught rather than published so far: it runs through two Bicocca courses, and the nearest work in the record is on strategic reasoning and automated synthesis for multi-agent systems.',
    evidence: ['content/cv.yaml'],
  },
];

export function strands(): Strand[] {
  return STRANDS.map((strand) => ({
    ...strand,
    absent: strand.evidence.filter((path) => !hasSource(path)),
  }));
}
