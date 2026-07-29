import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = process.env.ADOPTER_CHECK_TMPDIR
  ? resolve(process.env.ADOPTER_CHECK_TMPDIR)
  : tmpdir();
mkdirSync(temporaryRoot, { recursive: true });
const copy = mkdtempSync(join(temporaryRoot, 'adopter-build-'));
const syntheticName = 'Alex Newcomer';
const syntheticDomain = 'alex-newcomer.example';
const captainSurname = 'Stan';
const captainDomain = 'eduardstan.github.io';
const skipped = new Set([
  '.git',
  'node_modules',
  'web/node_modules',
  'web/dist',
  'web/.astro',
  'web/public/media',
]);

function shouldCopy(source) {
  const path = relative(root, source).replaceAll('\\', '/');
  return ![...skipped].some((entry) => path === entry || path.startsWith(`${entry}/`));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: copy,
    encoding: 'utf8',
    ...options,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with status ${result.status}`);
  }
}

function grep(needle, expected, options = {}) {
  const dist = join(copy, 'web/dist');
  const args = [
    options.word ? '-RInFw' : '-RInF',
    ...(options.ignoreCase ? ['-i'] : []),
    '--include=*.html',
    '--include=*.xml',
    '--include=*.json',
    '--include=*.txt',
    '--',
    needle,
    dist,
  ];
  process.stdout.write(`$ grep ${args.map((arg) => JSON.stringify(arg)).join(' ')}\n`);
  const result = spawnSync('grep', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status > 1) throw new Error(`grep failed with status ${result.status}`);
  const found = result.status === 0;
  if (!found) process.stdout.write('(no matches)\n');
  if (found !== expected) {
    const condition = expected ? 'was not derived into' : 'leaked into';
    throw new Error(
      `${JSON.stringify(needle)} ${condition} the synthetic adopter build. ` +
        'This second build proves the template works for someone other than the captain.',
    );
  }
}

let succeeded = false;
try {
  process.stdout.write(
    'Cold-start adopter check: this second build proves the template works for someone other than the captain.\n',
  );
  cpSync(root, copy, { recursive: true, filter: shouldCopy });
  const content = join(copy, 'content');
  rmSync(content, { recursive: true, force: true });
  mkdirSync(join(content, 'media'), { recursive: true });
  mkdirSync(join(content, 'posts'), { recursive: true });
  writeFileSync(
    join(content, 'cv.yaml'),
    `profile:
  name: ${syntheticName}
  site: https://${syntheticDomain}
  headline: Postdoctoral Researcher
  affiliation:
    - label: University of Somewhere
  place: Somewhere, Elsewhere
  email: alex@example.edu
  portrait: portrait.svg
  favicon: favicon.svg
  bio:
    short: ${syntheticName} is a postdoctoral researcher.
    long: I study reliable knowledge systems.

appointments: []
`,
  );
  writeFileSync(join(content, 'publications.bib'), '');
  writeFileSync(join(content, 'talks.bib'), '');
  writeFileSync(
    join(content, 'media/portrait.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="#246"/></svg>\n',
  );
  writeFileSync(
    join(content, 'media/favicon.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#246"/></svg>\n',
  );
  const dependencies = join(root, 'web/node_modules');
  if (!existsSync(dependencies)) {
    throw new Error('web/node_modules is missing; install web dependencies before this check');
  }
  symlinkSync(dependencies, join(copy, 'web/node_modules'), 'dir');
  run('npm', ['run', 'build'], { cwd: join(copy, 'web'), stdio: 'inherit' });

  grep(syntheticName, true);
  grep(syntheticDomain, true);
  grep(captainSurname, false, { ignoreCase: true, word: true });
  grep(captainDomain, false);
  succeeded = true;
} catch (error) {
  process.stderr.write(`Cold-start adopter check failed: ${error.message}\n`);
  process.stderr.write(`Throwaway build retained at ${copy}\n`);
  process.exitCode = 1;
} finally {
  if (succeeded) rmSync(copy, { recursive: true, force: true });
}
