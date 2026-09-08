#!/usr/bin/env node
/**
 * cropin-graph - build, validate, explain and diff the configuration-assist knowledge graph.
 *
 * Read-only in phase 1: every source connection opens read-only, the graph is a derived artefact that can
 * be rebuilt from scratch at any time, and nothing here writes to a platform master. The one command that
 * writes anything (`push`) writes the built graph to its own store, never back to a master.
 */
import '../core/env.js';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Command } from 'commander';
import { derive } from '../core/derive.js';
import { fromDocument, inlineHtml, serialise } from '../core/emit.js';
import { GraphDocumentSchema, type GraphDocument } from '../core/model.js';
import { ontology } from '../core/ontology.js';
import { run } from '../core/pipeline.js';
import { buildAdjacency, shortestPath } from '../core/traverse.js';
import { validate } from '../core/validate.js';
import { build } from '../core/build.js';
import { resolveSource } from '../sources/registry.js';
import { createSupabase } from '../sources/supabase.js';
import { listTenants, pullDocument, pushDocument } from '../store/graph-store.js';
import { buildMasterRows } from '../store/masters.js';
import { graphSeedSql, masterSeedSql } from '../store/sql.js';
import { bad, dim, line, ok, reportDerive, reportGraph, reportOntology, reportSource, reportValidation, warn } from './report.js';

const program = new Command();
program.name('cropin-graph').description('Cropin configuration-assist knowledge graph').version('0.1.0');

function loadDocument(path: string): GraphDocument {
  return GraphDocumentSchema.parse(JSON.parse(readFileSync(resolve(path), 'utf8')));
}

function writeOut(path: string, content: string): number {
  const abs = resolve(path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return statSync(abs).size;
}

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

/* ------------------------------------------------------------------- build */

program
  .command('build')
  .description('run the pipeline and emit graph.json')
  .option('-s, --source <name>', 'synthetic, csv or supabase', 'synthetic')
  .option('-m, --mapping <file>', 'mapping file, required for csv and supabase')
  .option('-t, --tenant <id>', 'tenant id; overrides the mapping file')
  .option('-o, --out <file>', 'output path', 'dist/demo/graph.json')
  .option('--inline <file>', 'also write a self-contained HTML with the document embedded')
  .option('--viewer <file>', 'built viewer HTML to inline into', 'dist/viewer/index.html')
  .option('--pretty', 'indent the JSON for diffing', false)
  .option('--parity', 'assert the prototype counts: 23 concepts, 338 records, 1149 links', false)
  .option('--built-at <iso>', 'freeze the build timestamp')
  .option('--no-strict', 'report invariant failures without failing the command')
  .action(async (o) => {
    reportOntology();
    const { source, tenantId } = await resolveSource(o.source, { mapping: o.mapping, tenant: o.tenant });
    const result = await run(source, { tenantId, parity: o.parity, builtAt: o.builtAt });
    reportSource(source.name, result.graph.records.length, result.graph.links.length);
    reportDerive(result.derived);
    reportValidation(result.validation);

    const json = serialise(result.doc, o.pretty);
    const size = writeOut(o.out, json);
    line('emit', `${o.out} (${kb(size)})`, '');
    if (o.inline) {
      const html = inlineHtml(resolve(o.viewer), serialise(result.doc, false));
      const s2 = writeOut(o.inline, html);
      line('', `${o.inline} (${kb(s2)}, self-contained)`, '');
    }
    reportGraph(result.validation);

    const cov = result.doc.meta.coverage;
    if (cov.concepts_with_no_records.length || cov.records_with_no_links.length || cov.unweighted_links) {
      line(
        'coverage',
        `${cov.unweighted_links} unweighted links, ${cov.concepts_with_no_records.length} empty concepts`,
        dim('see meta.coverage'),
      );
    }

    if (!result.validation.ok && o.strict) process.exitCode = 1;
  });

/* ---------------------------------------------------------------- validate */

program
  .command('validate')
  .description('re-run the invariants against an emitted document')
  .argument('<file>', 'graph.json')
  .option('--parity', 'also assert the prototype counts', false)
  .action((file: string, o) => {
    const doc = loadDocument(file);
    // Strip the derived numbers, recompute them from the links, then compare. Carrying them over would
    // check the file against itself, and would trip the build's guard against a source supplying a
    // number the ontology derives.
    const { bundle, claimed } = fromDocument(doc);
    const graph = build(bundle);
    const derived = derive(graph);
    reportSource(doc.meta.source, doc.records.length, doc.links.length);
    reportDerive(derived);
    const v = validate(graph, { parity: o.parity, claimed });
    reportValidation(v);
    reportGraph(v);
    if (!v.ok) process.exitCode = 1;
  });

/* ----------------------------------------------------------------- explain */

program
  .command('explain')
  .description('print one node with its metrics and every section as the UI would group them')
  .argument('<file>', 'graph.json')
  .requiredOption('-n, --node <id>', 'record or concept id')
  .action((file: string, o) => {
    const doc = loadDocument(file);
    const record = doc.records.find((r) => r.id === o.node);
    const concept = doc.concepts.find((c) => c.id === o.node);
    if (!record && !concept) {
      process.stderr.write(`${bad(`no node "${o.node}" in ${file}`)}\n`);
      process.exitCode = 1;
      return;
    }
    const id = o.node as string;
    const own = record ? doc.concepts.find((c) => c.id === record.concept)! : concept!;

    process.stdout.write(`\n${record ? record.label : concept!.label}  ${dim(id)}\n`);
    process.stdout.write(`${dim(`${own.label} - ${doc.meta.layers[own.layer]}`)}\n\n`);

    if (record?.summary) process.stdout.write(`${record.summary}\n\n`);
    if (record?.note) process.stdout.write(`${dim(`Note: ${record.note}`)}\n\n`);

    if (record && Object.keys(record.usage).length) {
      process.stdout.write(`${ok('Evidence')}\n`);
      for (const [k, v] of Object.entries(record.usage)) {
        process.stdout.write(`  ${k.padEnd(18)}${v.toLocaleString('en-IN')}\n`);
      }
      process.stdout.write('\n');
    }
    if (record && Object.keys(record.attrs).length) {
      process.stdout.write(`${ok('Configured')}\n`);
      for (const [k, v] of Object.entries(record.attrs)) process.stdout.write(`  ${k.padEnd(28)}${v}\n`);
      process.stdout.write('\n');
    }

    const label = (nodeId: string) =>
      doc.records.find((r) => r.id === nodeId)?.label ?? doc.concepts.find((c) => c.id === nodeId)?.label ?? nodeId;

    type Item = { text: string; plots: number };
    const groups = new Map<string, { order: number; heading: string; items: Item[] }>();
    const item = (nodeId: string, plots: number | undefined): Item => ({
      text: `${label(nodeId)}${plots === undefined ? '' : dim(`  ${plots.toLocaleString('en-IN')} plots`)}`,
      plots: plots ?? -1,
    });
    for (const l of doc.links) {
      const section = doc.meta.sections[l.rel];
      if (!section) continue;
      if (l.from === id) {
        const key = `f:${l.rel}`;
        if (!groups.has(key)) groups.set(key, { order: section.order, heading: section.forward, items: [] });
        groups.get(key)!.items.push(item(l.to, l.plots));
      } else if (l.to === id) {
        const key = `r:${l.rel}`;
        if (!groups.has(key)) groups.set(key, { order: section.order, heading: section.reverse, items: [] });
        groups.get(key)!.items.push(item(l.from, l.plots));
      }
    }
    if (concept) {
      const own2 = doc.records.filter((r) => r.concept === id);
      if (own2.length) {
        groups.set('records', {
          order: 0,
          heading: `Records of this type (${own2.length})`,
          items: own2.map((r) => ({ text: r.label, plots: r.usage.plots ?? -1 })),
        });
      }
    }

    for (const g of [...groups.values()].sort((a, b) => a.order - b.order || a.heading.localeCompare(b.heading))) {
      process.stdout.write(`${ok(g.heading)}\n`);
      g.items.sort((x, y) => y.plots - x.plots || x.text.localeCompare(y.text));
      for (const it of g.items.slice(0, 24)) process.stdout.write(`  ${it.text}\n`);
      if (g.items.length > 24) process.stdout.write(`  ${dim(`and ${g.items.length - 24} more`)}\n`);
      process.stdout.write('\n');
    }

    process.stdout.write(`${ok('How to decide')}\n  ${own.decide}\n\n`);
    process.stdout.write(`${ok('Definition')}\n  ${own.definition}\n\n`);
  });

/* -------------------------------------------------------------------- route */

program
  .command('route')
  .description('shortest path between two nodes, with the relationship on every link')
  .argument('<file>', 'graph.json')
  .requiredOption('--from <id>')
  .requiredOption('--to <id>')
  .action((file: string, o) => {
    const doc = loadDocument(file);
    const adj = buildAdjacency(doc);
    const path = shortestPath(adj, o.from, o.to);
    if (!path) {
      process.stderr.write(`${bad(`no route from ${o.from} to ${o.to}`)}\n`);
      process.exitCode = 1;
      return;
    }
    const label = (id: string) =>
      doc.records.find((r) => r.id === id)?.label ?? doc.concepts.find((c) => c.id === id)?.label ?? id;
    process.stdout.write(`\n${label(o.from)}\n`);
    for (const step of path) {
      const section = doc.meta.sections[step.rel];
      const heading = section ? (step.forward ? section.forward : section.reverse) : step.rel;
      process.stdout.write(`  ${dim(`|  ${heading}${step.plots ? ` (${step.plots.toLocaleString('en-IN')} plots)` : ''}`)}\n`);
      process.stdout.write(`${label(step.to)}\n`);
    }
    process.stdout.write(`\n${dim(`${path.length} hops`)}\n\n`);
  });

/* --------------------------------------------------------------------- diff */

program
  .command('diff')
  .description('records and links added, removed and re-weighted between two documents')
  .argument('<current>', 'graph.json')
  .argument('<previous>', 'graph.prev.json')
  .action((currentPath: string, previousPath: string) => {
    const a = loadDocument(previousPath);
    const b = loadDocument(currentPath);
    const recA = new Map(a.records.map((r) => [r.id, r]));
    const recB = new Map(b.records.map((r) => [r.id, r]));
    const linkKey = (l: { from: string; to: string; rel: string }) => `${l.rel}|${l.from}|${l.to}`;
    const linkA = new Map(a.links.map((l) => [linkKey(l), l]));
    const linkB = new Map(b.links.map((l) => [linkKey(l), l]));

    const addedR = [...recB.keys()].filter((k) => !recA.has(k));
    const removedR = [...recA.keys()].filter((k) => !recB.has(k));
    const changedR = [...recB.keys()].filter((k) => {
      const x = recA.get(k);
      if (!x) return false;
      const y = recB.get(k)!;
      return JSON.stringify([x.attrs, x.usage, x.label]) !== JSON.stringify([y.attrs, y.usage, y.label]);
    });
    const addedL = [...linkB.keys()].filter((k) => !linkA.has(k));
    const removedL = [...linkA.keys()].filter((k) => !linkB.has(k));
    const reweighted = [...linkB.keys()].filter((k) => linkA.has(k) && linkA.get(k)!.plots !== linkB.get(k)!.plots);

    line('records', `+${addedR.length} -${removedR.length} ~${changedR.length}`, '');
    line('links', `+${addedL.length} -${removedL.length} reweighted ${reweighted.length}`, '');
    const show = (title: string, items: string[]) => {
      if (!items.length) return;
      process.stdout.write(`\n${title}\n`);
      for (const i of items.slice(0, 30)) process.stdout.write(`  ${i}\n`);
      if (items.length > 30) process.stdout.write(`  ${dim(`and ${items.length - 30} more`)}\n`);
    };
    show(ok('added records'), addedR);
    show(bad('removed records'), removedR);
    show(warn('changed records'), changedR);
    show(ok('added links'), addedL);
    show(bad('removed links'), removedL);
    show(
      warn('reweighted links'),
      reweighted.map((k) => `${k}  ${linkA.get(k)!.plots ?? '-'} -> ${linkB.get(k)!.plots ?? '-'}`),
    );
    process.stdout.write('\n');
  });

/* ---------------------------------------------------------------------- sql */

program
  .command('sql')
  .description('emit SQL: seed the platform masters, or push a built graph, without needing a write key')
  .requiredOption('--what <kind>', 'masters or graph')
  .option('-t, --tenant <id>', 'tenant id', 'demo')
  .option('-f, --file <graph.json>', 'the document to push, for --what graph', 'dist/demo/graph.json')
  .option('-o, --out <file>', 'output path')
  .action(async (o) => {
    if (o.what === 'masters') {
      const sql = masterSeedSql(o.tenant);
      const out = o.out ?? `supabase/seed_masters_${o.tenant}.sql`;
      const size = writeOut(out, sql);
      const tables = buildMasterRows(o.tenant);
      line('masters', `${tables.length} tables, ${tables.reduce((a, t) => a + t.rows.length, 0)} rows`, ok('ok'));
      line('emit', `${out} (${kb(size)})`, '');
      process.stdout.write(`\n  ${dim('Run supabase/schema.sql first, then paste this into the SQL editor.')}\n\n`);
      return;
    }
    if (o.what === 'graph') {
      const doc = loadDocument(o.file);
      const out = o.out ?? `dist/${doc.meta.tenant_id}/graph.sql`;
      const size = writeOut(out, graphSeedSql(doc));
      line('graph', `${doc.meta.counts.records} records, ${doc.meta.counts.links} links`, ok('ok'));
      line('emit', `${out} (${kb(size)})`, '');
      return;
    }
    process.stderr.write(`${bad('--what must be masters or graph')}\n`);
    process.exitCode = 1;
  });

/* ------------------------------------------------------------- push and pull */

function storeClient(needsWrite: boolean) {
  const url = process.env.VITE_SUPABASE_URL;
  const write = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const read = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const key = needsWrite ? write : (read ?? write);
  if (!url || !key) {
    throw new Error(
      needsWrite
        ? 'a push needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Without a write key, use: cropin-graph sql --what graph'
        : 'set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example)',
    );
  }
  return createSupabase({ url, key });
}

program
  .command('push')
  .description('push a built document into the graph store (needs a write key)')
  .option('-f, --file <graph.json>', 'the document to push', 'dist/demo/graph.json')
  .action(async (o) => {
    const doc = loadDocument(o.file);
    const report = await pushDocument(storeClient(true), doc);
    line('push', `${doc.meta.tenant_id}: ${report.records} records, ${report.links} links`, ok('ok'));
  });

program
  .command('pull')
  .description('read a stored document back out of the graph store')
  .option('-t, --tenant <id>', 'tenant id', 'demo')
  .option('-o, --out <file>', 'output path', 'dist/pulled/graph.json')
  .option('--pretty', 'indent the JSON', false)
  .action(async (o) => {
    const doc = await pullDocument(storeClient(false), o.tenant);
    const size = writeOut(o.out, serialise(doc, o.pretty));
    line('pull', `${doc.meta.tenant_id}, built ${doc.meta.built_at}`, `${doc.meta.counts.records} records`);
    line('emit', `${o.out} (${kb(size)})`, '');
  });

program
  .command('tenants')
  .description('list the tenants with a graph in the store')
  .action(async () => {
    const rows = await listTenants(storeClient(false));
    if (rows.length === 0) {
      process.stdout.write(`  ${dim('no graph has been pushed yet')}\n`);
      return;
    }
    for (const r of rows) {
      const counts = r.counts as { records?: number; links?: number } | null;
      line(r.tenant_id, `built ${r.built_at}`, `${counts?.records ?? '?'} records, ${counts?.links ?? '?'} links`);
    }
  });

/* -------------------------------------------------------------- ontology info */

program
  .command('ontology')
  .description('print the loaded ontology: layers, concepts and relations')
  .action(() => {
    for (const layer of ontology.layers) {
      process.stdout.write(`\n${ok(layer.label)}  ${dim(layer.key)}\n`);
      for (const c of ontology.concepts.filter((x) => x.layer === layer.key)) {
        process.stdout.write(`  ${c.label.padEnd(28)}${dim(c.source)}\n`);
      }
    }
    process.stdout.write(`\n${ok('Relations')}\n`);
    for (const r of ontology.relations) {
      process.stdout.write(
        `  ${String(r.order).padStart(3)} ${r.key.padEnd(20)} ${r.forward.padEnd(38)} ${dim(r.reverse)}\n`,
      );
    }
    process.stdout.write('\n');
  });

await program.parseAsync(process.argv);
