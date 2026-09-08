/**
 * Builds the deployable static site.
 *
 * The viewer reads a document, not a database, so a deployment needs exactly two things: the built
 * viewer, and a document sitting next to it. That is why the hosted site needs no environment
 * variables and no API to be useful - the API adds search and routing for other consumers, but the
 * viewer already derives all of that from the document itself.
 *
 * Order matters: the graph is built first, because `--inline` needs the viewer, and the copy needs the
 * graph.
 *
 * Run: npm run build:static
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const TENANT = process.env.GRAPH_TENANT ?? 'demo';
const SOURCE = process.env.GRAPH_SOURCE ?? 'synthetic';
const MAPPING = process.env.GRAPH_MAPPING ?? 'mappings/default.yaml';

const run = (label, file, args) => {
  process.stdout.write(`  ${label.padEnd(18)}`);
  execFileSync(file, args, { stdio: ['ignore', 'pipe', 'inherit'], shell: process.platform === 'win32' });
  process.stdout.write('ok\n');
};

const kb = (path) => `${Math.round(statSync(path).size / 1024)} KB`;

const graphPath = resolve(`dist/${TENANT}/graph.json`);
const viewerDir = resolve('dist/viewer');

/*
 * Build the document. Synthetic needs nothing; supabase needs credentials, so fall back rather than
 * fail a deployment over a missing variable - a site serving the reference tenant is far better than a
 * site that did not build.
 */
const buildArgs = ['src/cli/index.ts', 'build', '--tenant', TENANT, '--out', `dist/${TENANT}/graph.json`, '--pretty'];
let source = SOURCE;
if (source === 'supabase' && !(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
  process.stdout.write('  note            no Supabase credentials, building the reference tenant instead\n');
  source = 'synthetic';
}
try {
  run(
    `graph (${source})`,
    'npx',
    ['tsx', ...buildArgs, '--source', source, ...(source === 'supabase' ? ['--mapping', MAPPING] : [])],
  );
} catch (err) {
  if (source === 'synthetic') throw err;
  process.stdout.write('  note            the database build failed, falling back to the reference tenant\n');
  run('graph (synthetic)', 'npx', ['tsx', ...buildArgs, '--source', 'synthetic']);
}

run('viewer', 'npx', ['vite', 'build', '--config', 'viewer/vite.config.ts']);

if (!existsSync(graphPath)) throw new Error(`no document at ${graphPath}`);
mkdirSync(viewerDir, { recursive: true });
copyFileSync(graphPath, resolve(viewerDir, 'graph.json'));

process.stdout.write(`  publish         dist/viewer/index.html + graph.json (${kb(graphPath)})\n`);
