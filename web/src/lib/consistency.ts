/**
 * The consistency gate: the repository checked against itself.
 *
 * The site's claim is that every rendered fact can be opened to show the record
 * behind it. That claim is only worth making if the records cannot quietly
 * disagree with each other, so this module compares the ones that state the same
 * thing twice and refuses the build when they contradict.
 *
 * Three rules decide what is a contradiction and what is merely untidy:
 *
 *   1. **Exact keys only, never prose.** Two records are the same fact because
 *      they are the same YAML entry or the same BibTeX entry — never because
 *      their names look alike. Name matching fails in both directions on this
 *      repository's real data (`for` vs `of` in one venue name, a missing
 *      acronym in another), and a gate with a false positive is a gate that gets
 *      switched off in its first week.
 *   2. **A comparator that returns "unknown" does not fire.** An unreadable date
 *      or a fact that states no year is counted in the coverage below, not
 *      reported as a disagreement.
 *   3. **Contradiction fails the build; incompleteness does not.** Two records
 *      that cannot both be true are a logic error. A record that is merely
 *      missing something is a state of the world, and failing on it would force
 *      someone to invent data to unblock a truth-checker.
 *
 * Where it runs: `astro:build:done` (`astro.config.mjs`), which runs on
 * `astro build` and never on `astro dev`. The author editing `cv.yaml` at 2am is
 * never blocked; nothing publishable ships a contradiction. The same function
 * renders its findings on the page under the inspect switch, and
 * `consistency.test.ts` asserts on it, so the page, the build and the test all read
 * one verdict.
 *
 * The gate states its own coverage. "0 contradictions" without "over how many
 * comparisons" is decorative.
 */
import { parse } from 'yaml';
import type { CV, Exception, ServiceEntry } from './cv.ts';
import { bibliography, readSource, SOURCES } from './record.ts';

/**
 * The CV read the way `announcements.ts` reads it — through `record.ts`'s
 * walk-up-for-`_config.yml` root rather than through `cv.ts`'s `?raw` import,
 * because this module also runs under plain `node` in the self-check and inside
 * the Astro config's own module graph, neither of which is a Vite page build.
 * The type is shared, so the two readers cannot disagree about the shape.
 */
const cvRaw = readSource(SOURCES.cv);
const cv = parse(cvRaw) as CV;

// ---------------------------------------------------------------- checks ----

export interface Check {
  id: string;
  /** One sentence, rendered on the page: what this check refuses to allow. */
  statement: string;
  sources: string[];
}

/**
 * The whole roster. One check, and that is not an accident: every other check
 * the design proposed joined against a source this site no longer reads.
 * `_pages/professional_activities.md` is retired (`record.test.ts` fails if a
 * reader for it comes back) and `_news/` is read only by the Jekyll site, so
 * the checks that compared against them would have to re-open exactly the
 * second-copy problem this rebuild closed.
 *
 * What is left is the one class of duplicate the architecture cannot remove: a
 * fact that states its own date and *also* carries the date it was announced on.
 * Both are hand-typed, both are in the file, and only one of them can be right
 * about the year.
 */
export const CHECKS: Check[] = [
  {
    id: 'announced-in-own-year',
    statement:
      'an announcement date must fall in the year of the fact it hangs on, or the year before it ' +
      '(invited in N−1 to serve at the N edition)',
    sources: [SOURCES.cv, SOURCES.bibliography],
  },
];

const CHECK_IDS = new Set(CHECKS.map((check) => check.id));

// ---------------------------------------------------------------- shapes ----

/** One side of a comparison: what was compared, its value, and where it lives. */
export interface Side {
  label: string;
  value: string;
  /** `path:line`, so the reader does not have to go hunting. */
  source: string;
}

export interface Finding {
  check: string;
  /** The record both sides belong to — `service[1] "Frontiers…"`. */
  subject: string;
  sides: Side[];
  /** Why these two values cannot both be true, in one sentence. */
  why: string;
  /** Set when a declared exception on the fact excuses this finding. */
  excused?: Exception;
}

/** A record the gate could not compare, and the reason, counted not hidden. */
export interface Uncomparable {
  what: string;
  why: string;
  source: string;
}

export interface Gate {
  checks: Check[];
  /** Pairs actually compared — the denominator for "0 contradictions". */
  comparisons: number;
  uncomparable: Uncomparable[];
  /** Unexcused. These fail `astro build`. */
  contradictions: Finding[];
  /** Excused by a declared exception. Visible, and not a failure. */
  excused: Finding[];
  /** Malformed, unknown or expired exceptions. These fail `astro build` too. */
  exceptionProblems: Uncomparable[];
  /** Exceptions excusing nothing — someone fixed the data, left the excuse. */
  stale: { subject: string; exception: Exception }[];
}

// -------------------------------------------------------------- locations ---

/**
 * `path:line` for a value, by scanning the file's own text for it.
 *
 * ponytail: first occurrence wins, so a value that appears twice points at the
 * first one. Upgrade to a position-carrying YAML parse only if that ever
 * misleads someone; today every stamp reported here is unique in its file.
 */
function locator(path: string): (value: string) => string {
  const lines = readSource(path).split('\n');
  return (value: string) => {
    const index = lines.findIndex((line) => line.includes(value));
    return index === -1 ? path : `${path}:${index + 1}`;
  };
}

// ------------------------------------------------------------ the check -----

/** The year a fact states, from the CV's own `Mar 2024–Present` spelling. */
const statedYear = (dates: string | undefined) => Number(/(\d{4})/.exec(dates ?? '')?.[1] ?? 0);

/** The year an ISO stamp states. Anything else is unknown, and does not fire. */
const announcedYear = (stamp: string) =>
  /^\d{4}-\d{2}/.test(stamp) ? Number(stamp.slice(0, 4)) : 0;

/**
 * One (fact, announcement) pair, ready to compare. Both sides are hand-typed,
 * neither derived from the other, and they belong to the same record by
 * construction rather than by matching prose.
 */
interface Pair {
  subject: string;
  year: number;
  yearLabel: string;
  yearValue: string;
  yearSource: string;
  announced: string;
  announcedSource: string;
  except: Exception[];
}

function pairsFromCv(uncomparable: Uncomparable[]): Pair[] {
  const at = locator(SOURCES.cv);
  const pairs: Pair[] = [];

  const add = (
    subject: string,
    dates: string | undefined,
    announced: string,
    except: Exception[],
    yearLabel = 'dates',
    yearValue = dates ?? '',
    yearSource = at(dates ?? ''),
  ) => {
    const year = yearLabel === 'dates' ? statedYear(dates) : Number(yearValue);
    if (!year) {
      uncomparable.push({
        what: subject,
        why: 'carries an announcement date but states no year of its own to compare it against',
        source: at(announced),
      });
      return;
    }
    pairs.push({
      subject,
      year,
      yearLabel,
      yearValue,
      yearSource,
      announced,
      announcedSource: at(announced),
      except,
    });
  };

  cv.appointments.forEach((post, index) => {
    if (post.announced)
      add(
        `appointments[${index}] "${post.organisation}"`,
        post.dates,
        post.announced,
        post.except ?? [],
      );
  });

  cv.service.forEach((entry: ServiceEntry, index) => {
    const subject = `service[${index}] "${entry.venue}"`;
    const except = entry.except ?? [];
    if (entry.announced) add(subject, entry.dates, entry.announced, except);
    for (const edition of entry.years ?? []) {
      if (!edition.announced) continue;
      add(
        `${subject} ${edition.year}`,
        undefined,
        edition.announced,
        except,
        'year',
        String(edition.year),
        at(`year: ${edition.year}`),
      );
    }
  });

  return pairs;
}

/**
 * The bibliography's own version of the same duplicate: an entry that states a
 * `year` and also an `announced` day. There is no exception mechanism here —
 * a BibTeX entry is not a place to argue with a checker, and no entry has ever
 * needed one; if one does, the fix is the data.
 */
function pairsFromBibliography(uncomparable: Uncomparable[]): Pair[] {
  const at = locator(SOURCES.bibliography);
  const pairs: Pair[] = [];
  for (const entry of bibliography().entries) {
    const announced = entry.fields.announced?.trim();
    if (!announced) continue;
    const subject = `${entry.key} "${entry.title}"`;
    if (!entry.year) {
      uncomparable.push({
        what: subject,
        why: 'carries an announcement date but states no year of its own to compare it against',
        source: at(announced),
      });
      continue;
    }
    pairs.push({
      subject,
      year: entry.year,
      yearLabel: 'year',
      yearValue: String(entry.year),
      yearSource: at(`year         = {${entry.year}}`),
      announced,
      announcedSource: at(announced),
      except: [],
    });
  }
  return pairs;
}

// ------------------------------------------------------------ exceptions ----

/** ISO day, or the word the design allows for an excuse that will not expire. */
const PERMANENT = 'permanent';

/**
 * An exception is declared on the fact, in the data, beside what it excuses —
 * not in a suppressions file and not as a flag. Every rule below fails the build
 * when broken, because a typo must never look like a successful excuse.
 */
export function exceptionProblem(
  exception: Exception,
  subject: string,
  today: string,
): string | undefined {
  if (!CHECK_IDS.has(exception.check))
    return `names no check the gate runs ("${exception.check}"); the roster is ${[
      ...CHECK_IDS,
    ].join(', ')}`;
  if ((exception.because ?? '').trim().length < 20)
    return 'states no reason — `because:` is rendered to the reader, so a blank one is a lie in public';
  if (exception.until !== PERMANENT && !/^\d{4}-\d{2}-\d{2}$/.test(exception.until ?? ''))
    return `has no expiry — \`until:\` must be an ISO day or \`${PERMANENT}\` (got "${exception.until}")`;
  if (exception.until !== PERMANENT && exception.until < today)
    return `expired on ${exception.until}; the finding it excused for "${subject}" is back`;
  return undefined;
}

// ---------------------------------------------------------------- the gate --

let cache: { today: string; gate: Gate } | undefined;

/**
 * Run every check. Cached in a module-level `let`, like the readers in
 * `record.ts`. The Astro config loads in a different module graph from the page
 * modules, so the build hook gets its own cache and reads the sources a second
 * time — one extra pass over 73 KB. Do not couple the two to save it.
 */
export function consistency(today = new Date().toISOString().slice(0, 10)): Gate {
  if (cache?.today === today) return cache.gate;
  const uncomparable: Uncomparable[] = [];
  const pairs = [...pairsFromCv(uncomparable), ...pairsFromBibliography(uncomparable)];

  const contradictions: Finding[] = [];
  const excused: Finding[] = [];
  const exceptionProblems: Uncomparable[] = [];
  const stale: Gate['stale'] = [];
  const fired = new Set<string>();
  let comparisons = 0;

  for (const pair of pairs) {
    const announced = announcedYear(pair.announced);
    if (!announced) {
      uncomparable.push({
        what: pair.subject,
        why: `its announcement date ${pair.announced} is not ISO 8601, so no year can be read from it`,
        source: pair.announcedSource,
      });
      continue;
    }
    comparisons++;
    if (announced === pair.year || announced === pair.year - 1) continue;

    fired.add(`${pair.subject}|announced-in-own-year`);
    const finding: Finding = {
      check: 'announced-in-own-year',
      subject: pair.subject,
      sides: [
        { label: pair.yearLabel, value: pair.yearValue, source: pair.yearSource },
        { label: 'announced', value: pair.announced, source: pair.announcedSource },
      ],
      why:
        `An announcement must fall in the fact's own year or the year before it. ` +
        `${announced} is neither ${pair.year} nor ${pair.year - 1}.`,
      excused: pair.except.find((exception) => exception.check === 'announced-in-own-year'),
    };
    if (finding.excused) excused.push(finding);
    else contradictions.push(finding);
  }

  // Every declared exception is itself checked: unknown id, blank reason,
  // missing or passed expiry all fail the build; one that excuses nothing is
  // shown, because someone fixed the data and left the excuse behind.
  const declared: { subject: string; except: Exception[] }[] = [
    ...cv.appointments.map((post, index) => ({
      subject: `appointments[${index}] "${post.organisation}"`,
      except: post.except ?? [],
    })),
    ...cv.service.map((entry, index) => ({
      subject: `service[${index}] "${entry.venue}"`,
      except: entry.except ?? [],
    })),
  ];
  for (const { subject, except } of declared) {
    for (const exception of except) {
      const problem = exceptionProblem(exception, subject, today);
      if (problem) {
        exceptionProblems.push({
          what: subject,
          why: `the exception ${problem}`,
          source: SOURCES.cv,
        });
        // An expired or malformed exception excuses nothing, so the finding it
        // was silencing has to come back with it.
        const wrongly = excused.findIndex(
          (finding) => finding.subject.startsWith(subject) && finding.check === exception.check,
        );
        if (wrongly !== -1) {
          const [finding] = excused.splice(wrongly, 1);
          contradictions.push({ ...finding, excused: undefined });
        }
        continue;
      }
      // An entry-level exception covers the entry and its editions, so a
      // finding on `service[7] "…" 2026` is matched by the prefix.
      if (![...fired].some((key) => key.startsWith(subject) && key.endsWith(`|${exception.check}`)))
        stale.push({ subject, exception });
    }
  }

  const gate: Gate = {
    checks: CHECKS,
    comparisons,
    uncomparable,
    contradictions,
    excused,
    exceptionProblems,
    stale,
  };
  cache = { today, gate };
  return gate;
}

// ------------------------------------------------------------- the report ---

/** The coverage line. Every number in it is counted, none is typed. */
export const coverage = (gate: Gate) =>
  `${gate.checks.length} ${gate.checks.length === 1 ? 'check' : 'checks'} · ` +
  `${gate.comparisons} comparisons · ${gate.contradictions.length} contradictions · ` +
  `${gate.excused.length} excused · ${gate.uncomparable.length} records with nothing to compare against`;

/**
 * What the failed build prints. It names both sides and both file paths, and it
 * carries its own escape hatch: a gate that reads as a wall gets deleted, a gate
 * that reads as a fork in the road does not.
 */
export function report(gate: Gate): string {
  const lines: string[] = [];
  const problems = gate.contradictions.length + gate.exceptionProblems.length;
  lines.push(
    problems === 0
      ? `✓ Consistency gate — ${coverage(gate)}.`
      : `✗ Consistency gate — ${gate.contradictions.length} contradictions, ` +
          `${gate.exceptionProblems.length} bad exceptions. Build refused.`,
  );
  for (const finding of gate.contradictions) {
    lines.push('', `  ${finding.check}`, `    ${finding.subject}`);
    for (const side of finding.sides)
      lines.push(`      ${side.label.padEnd(10)} ${side.value.padEnd(28)} ${side.source}`);
    lines.push(`    ${finding.why}`);
    lines.push(
      '',
      '    Fix one of the two, or excuse this one fact in cv/cv.yaml:',
      '      except:',
      `        - check: ${finding.check}`,
      '          because: <why both values are correct>',
      '          until: YYYY-MM-DD',
    );
  }
  for (const problem of gate.exceptionProblems)
    lines.push(
      '',
      '  exception rejected',
      `    ${problem.source}   ${problem.what}`,
      `    ${problem.why}`,
    );
  if (problems > 0) {
    lines.push('', `  ${coverage(gate)}.`);
    lines.push('  `astro dev` still runs; the findings render under the inspect switch.');
  }
  return lines.join('\n');
}
