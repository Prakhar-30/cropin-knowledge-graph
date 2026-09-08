/**
 * The API.
 *
 * It serves built documents and the derived views the viewer needs - grouped sections for a node, a
 * route between two nodes, a label search. Nothing here builds a graph and nothing here writes: a
 * document arrives either from disk or from the graph store, both of which are derived artefacts.
 *
 * Sections are resolved server side rather than in the browser because the display headings are part of
 * the document contract, and one implementation of that contract is easier to keep honest than two.
 *
 * This module builds the app. It never listens - see index.ts and api/index.ts.
 */
import '../core/env.js';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { GraphDocumentSchema, type GraphDocument } from '../core/model.js';
import { ontology } from '../core/ontology.js';
import { buildAdjacency, hopDistances, shortestPath, type Adjacency } from '../core/traverse.js';
import { createSupabase } from '../sources/supabase.js';
import { pullDocument } from '../store/graph-store.js';

const PORT = Number(process.env.PORT ?? 8787);
const DIST = resolve(process.env.GRAPH_DIST_DIR ?? 'dist');
const VIEWER = resolve(DIST, 'viewer');

interface Loaded {
  doc: GraphDocument;
  adj: Adjacency;
  origin: string;
}

const cache = new Map<string, Loaded>();

function fromDisk(tenant: string): GraphDocument | null {
  const path = resolve(DIST, tenant, 'graph.json');
  if (!existsSync(path)) return null;
  return GraphDocumentSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

async function fromStore(tenant: string): Promise<GraphDocument | null> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    return await pullDocument(createSupabase({ url, key }), tenant);
  } catch {
    return null;
  }
}

async function load(tenant: string, refresh = false): Promise<Loaded | null> {
  if (!refresh && cache.has(tenant)) return cache.get(tenant)!;
  const disk = fromDisk(tenant);
  const doc = disk ?? (await fromStore(tenant));
  if (!doc) return null;
  const loaded: Loaded = { doc, adj: buildAdjacency(doc), origin: disk ? 'file' : 'graph store' };
  cache.set(tenant, loaded);
  return loaded;
}

function tenantsOnDisk(): string[] {
  if (!existsSync(DIST)) return [];
  return readdirSync(DIST, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(resolve(DIST, e.name, 'graph.json')))
    .map((e) => e.name)
    .sort();
}

/* ------------------------------------------------------------------ helpers */

const labelOf = (doc: GraphDocument, id: string) =>
  doc.records.find((r) => r.id === id)?.label ?? doc.concepts.find((c) => c.id === id)?.label ?? id;

interface Section {
  rel: string;
  direction: 'out' | 'in';
  heading: string;
  order: number;
  items: Array<{ id: string; label: string; concept: string; plots?: number; note?: string }>;
}

function sectionsFor(doc: GraphDocument, id: string): Section[] {
  const conceptOf = (nodeId: string) =>
    doc.records.find((r) => r.id === nodeId)?.concept ?? (nodeId.startsWith('c:') ? nodeId : '');
  const groups = new Map<string, Section>();
  for (const l of doc.links) {
    const meta = doc.meta.sections[l.rel];
    if (!meta) continue;
    const push = (direction: 'out' | 'in', other: string) => {
      const key = `${direction}:${l.rel}`;
      if (!groups.has(key)) {
        groups.set(key, {
          rel: l.rel,
          direction,
          heading: direction === 'out' ? meta.forward : meta.reverse,
          order: meta.order,
          items: [],
        });
      }
      groups.get(key)!.items.push({
        id: other,
        label: labelOf(doc, other),
        concept: conceptOf(other),
        ...(l.plots === undefined ? {} : { plots: l.plots }),
        ...(l.note ? { note: l.note } : {}),
      });
    };
    if (l.from === id) push('out', l.to);
    else if (l.to === id) push('in', l.from);
  }
  const out = [...groups.values()];
  for (const s of out) s.items.sort((a, b) => (b.plots ?? -1) - (a.plots ?? -1) || a.label.localeCompare(b.label));
  return out.sort((a, b) => a.order - b.order || a.heading.localeCompare(b.heading));
}

/* -------------------------------------------------------------------- routes */

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const withGraph = (
  handler: (loaded: Loaded, req: Request, res: Response) => void | Promise<void>,
) => async (req: Request, res: Response) => {
  const tenant = String(req.query.tenant ?? 'demo');
  const loaded = await load(tenant, req.query.refresh === '1');
  if (!loaded) {
    res.status(404).json({
      error: `no graph for tenant "${tenant}"`,
      hint: 'run: npm run graph -- build --source synthetic --tenant demo --out dist/demo/graph.json',
      available: tenantsOnDisk(),
    });
    return;
  }
  try {
    await handler(loaded, req, res);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    ontology: {
      concepts: ontology.concepts.length,
      relations: ontology.relations.length,
      layers: ontology.layers.length,
    },
    tenants: tenantsOnDisk(),
    dist: DIST,
  });
});

app.get('/api/ontology', (_req, res) => {
  res.json({
    layers: ontology.layers,
    concepts: ontology.concepts,
    relations: ontology.relations,
    derivations: ontology.derivations,
  });
});

app.get('/api/graph', withGraph((loaded, _req, res) => {
  res.setHeader('X-Graph-Origin', loaded.origin);
  res.json(loaded.doc);
}));

app.get('/api/meta', withGraph((loaded, _req, res) => {
  res.json({ ...loaded.doc.meta, origin: loaded.origin });
}));

app.get('/api/node/:id', withGraph((loaded, req, res) => {
  const { doc } = loaded;
  const id = req.params.id;
  const record = doc.records.find((r) => r.id === id);
  const concept = doc.concepts.find((c) => c.id === id);
  if (!record && !concept) {
    res.status(404).json({ error: `no node "${id}"` });
    return;
  }
  const own = record ? doc.concepts.find((c) => c.id === record.concept)! : concept!;
  res.json({
    id,
    kind: record ? 'record' : 'concept',
    label: record?.label ?? concept!.label,
    concept: { id: own.id, key: own.key, label: own.label, layer: own.layer, definition: own.definition, decide: own.decide, source: own.source },
    summary: record?.summary,
    note: record?.note,
    attrs: record?.attrs ?? {},
    usage: record?.usage ?? {},
    records: concept ? doc.records.filter((r) => r.concept === id).length : undefined,
    sections: sectionsFor(doc, id),
  });
}));

app.get('/api/route', withGraph((loaded, req, res) => {
  const from = String(req.query.from ?? '');
  const to = String(req.query.to ?? '');
  const path = shortestPath(loaded.adj, from, to);
  if (!path) {
    res.status(404).json({ error: `no route from "${from}" to "${to}"` });
    return;
  }
  res.json({
    from,
    to,
    hops: path.length,
    steps: path.map((s) => {
      const meta = loaded.doc.meta.sections[s.rel];
      return {
        ...s,
        fromLabel: labelOf(loaded.doc, s.from),
        toLabel: labelOf(loaded.doc, s.to),
        heading: meta ? (s.forward ? meta.forward : meta.reverse) : s.rel,
      };
    }),
  });
}));

app.get('/api/neighbourhood/:id', withGraph((loaded, req, res) => {
  const hops = Math.min(Number(req.query.hops ?? 2), 6);
  const dist = hopDistances(loaded.adj, req.params.id, hops);
  res.json({
    id: req.params.id,
    hops,
    nodes: [...dist.entries()]
      .map(([id, d]) => ({ id, label: labelOf(loaded.doc, id), hop: d }))
      .sort((a, b) => a.hop - b.hop || a.label.localeCompare(b.label)),
  });
}));

app.get('/api/search', withGraph((loaded, req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  if (!q) {
    res.json({ q, results: [] });
    return;
  }
  const { doc } = loaded;
  const results = [
    ...doc.concepts.map((c) => ({ id: c.id, label: c.label, kind: 'concept' as const, concept: c.id, plots: 0 })),
    ...doc.records.map((r) => ({ id: r.id, label: r.label, kind: 'record' as const, concept: r.concept, plots: r.usage.plots ?? 0 })),
  ]
    .filter((n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || b.plots - a.plots || a.label.localeCompare(b.label);
    })
    .slice(0, 40);
  res.json({ q, results });
}));

/* ----------------------------------------------------------- static viewer */

if (existsSync(VIEWER)) {
  app.use(express.static(VIEWER));
  app.get('*', (_req, res) => res.sendFile(resolve(VIEWER, 'index.html')));
} else {
  app.get('/', (_req, res) => {
    res
      .status(200)
      .type('text/plain')
      .send(
        [
          'Cropin knowledge graph API is up.',
          '',
          'The viewer has not been built yet. Run:',
          '  npm run build:viewer',
          '',
          'Endpoints:',
          '  /api/health',
          '  /api/ontology',
          '  /api/graph?tenant=demo',
          '  /api/node/:id?tenant=demo',
          '  /api/route?from=...&to=...',
          '  /api/search?q=potato',
        ].join('\n'),
      );
  });
}

/**
 * The app is exported rather than started here. Locally `src/server/index.ts` listens on a port; on a
 * serverless platform `api/index.ts` hands the same app over as a request handler. One set of routes,
 * two ways of being reached.
 */
export const api = app;
export { PORT, DIST, tenantsOnDisk };
