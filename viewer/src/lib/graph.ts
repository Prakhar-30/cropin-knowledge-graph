/**
 * The viewer reads the document contract and nothing else.
 *
 * It deliberately does not import the pipeline's own modules: the emitted graph.json has to be enough
 * on its own, because one of the delivery modes is a single self-contained HTML file with the document
 * inlined and no server behind it. If the viewer needed the pipeline to interpret its own output, that
 * would not be a contract.
 */

export interface Concept {
  id: string;
  key: string;
  label: string;
  layer: string;
  definition: string;
  decide: string;
  source: string;
  label_scope?: string;
  records: number;
}

export interface Rec {
  id: string;
  concept: string;
  label: string;
  attrs: Record<string, string>;
  usage: Record<string, number>;
  note?: string;
  summary?: string;
}

export interface Link {
  from: string;
  to: string;
  rel: string;
  plots?: number;
  note?: string;
}

export interface SectionMeta {
  order: number;
  forward: string;
  reverse: string;
  weighted: boolean;
}

export interface GraphDoc {
  meta: {
    schema_version: string;
    tenant_id: string;
    built_at: string;
    source_snapshot: string;
    source: string;
    layers: Record<string, string>;
    layer_order: string[];
    sections: Record<string, SectionMeta>;
    counts: { concepts: number; records: number; links: number };
    evidence_rule: string;
    coverage: {
      concepts_with_no_records: string[];
      records_with_no_links: string[];
      unweighted_links: number;
      metrics_not_computed: string[];
    };
    graph?: { components: number; longest_path: number; mean_path: number };
  };
  concepts: Concept[];
  records: Rec[];
  links: Link[];
}

export const MEMBERSHIP = 'record of';

export interface Edge {
  other: string;
  rel: string;
  forward: boolean;
  plots?: number;
}

export interface SectionItem {
  id: string;
  label: string;
  layer: string;
  plots?: number;
  note?: string;
}

export interface Section {
  key: string;
  rel: string;
  direction: 'out' | 'in';
  heading: string;
  order: number;
  items: SectionItem[];
}

export interface Indexed {
  doc: GraphDoc;
  conceptById: Map<string, Concept>;
  recordById: Map<string, Rec>;
  recordsByConcept: Map<string, Rec[]>;
  outgoing: Map<string, Link[]>;
  incoming: Map<string, Link[]>;
  neighbours: Map<string, Edge[]>;
  maxPlots: number;
  layerOf: (id: string) => string;
  labelOf: (id: string) => string;
  conceptOf: (id: string) => Concept | undefined;
  isConcept: (id: string) => boolean;
}

const push = <T>(m: Map<string, T[]>, k: string, v: T) => {
  const list = m.get(k);
  if (list) list.push(v);
  else m.set(k, [v]);
};

export function index(doc: GraphDoc): Indexed {
  const conceptById = new Map(doc.concepts.map((c) => [c.id, c]));
  const recordById = new Map(doc.records.map((r) => [r.id, r]));
  const recordsByConcept = new Map<string, Rec[]>();
  for (const c of doc.concepts) recordsByConcept.set(c.id, []);
  for (const r of doc.records) push(recordsByConcept, r.concept, r);

  const outgoing = new Map<string, Link[]>();
  const incoming = new Map<string, Link[]>();
  const neighbours = new Map<string, Edge[]>();
  let maxPlots = 1;

  for (const l of doc.links) {
    push(outgoing, l.from, l);
    push(incoming, l.to, l);
    push(neighbours, l.from, { other: l.to, rel: l.rel, forward: true, plots: l.plots });
    push(neighbours, l.to, { other: l.from, rel: l.rel, forward: false, plots: l.plots });
    if (l.plots && l.plots > maxPlots) maxPlots = l.plots;
  }
  // Concept membership is an edge for navigation and an attribute in the document. Without it a concept
  // node would be unreachable from its own records.
  for (const r of doc.records) {
    push(neighbours, r.id, { other: r.concept, rel: MEMBERSHIP, forward: true });
    push(neighbours, r.concept, { other: r.id, rel: MEMBERSHIP, forward: false });
  }

  const isConcept = (id: string) => id.startsWith('c:');
  const conceptOf = (id: string) => {
    if (isConcept(id)) return conceptById.get(id);
    const rec = recordById.get(id);
    return rec ? conceptById.get(rec.concept) : undefined;
  };

  return {
    doc,
    conceptById,
    recordById,
    recordsByConcept,
    outgoing,
    incoming,
    neighbours,
    maxPlots,
    isConcept,
    conceptOf,
    layerOf: (id) => conceptOf(id)?.layer ?? 'hierarchy',
    labelOf: (id) => recordById.get(id)?.label ?? conceptById.get(id)?.label ?? id,
  };
}

/** Sections, in the order and with the headings the document dictates. */
export function sectionsFor(g: Indexed, id: string): Section[] {
  const groups = new Map<string, Section>();
  const add = (l: Link, direction: 'out' | 'in', other: string) => {
    const meta = g.doc.meta.sections[l.rel];
    if (!meta) return;
    const key = `${direction}:${l.rel}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        rel: l.rel,
        direction,
        heading: direction === 'out' ? meta.forward : meta.reverse,
        order: meta.order,
        items: [],
      });
    }
    groups.get(key)!.items.push({
      id: other,
      label: g.labelOf(other),
      layer: g.layerOf(other),
      plots: l.plots,
      note: l.note,
    });
  };
  for (const l of g.outgoing.get(id) ?? []) add(l, 'out', l.to);
  for (const l of g.incoming.get(id) ?? []) add(l, 'in', l.from);

  const out = [...groups.values()];
  for (const s of out) s.items.sort((a, b) => (b.plots ?? -1) - (a.plots ?? -1) || a.label.localeCompare(b.label));
  return out.sort((a, b) => a.order - b.order || a.heading.localeCompare(b.heading));
}

export interface SearchHit {
  id: string;
  label: string;
  layer: string;
  kind: 'concept' | 'record';
  conceptLabel: string;
  plots: number;
  scope?: string;
}

export function search(g: Indexed, raw: string, limit = 30): SearchHit[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const c of g.doc.concepts) {
    if (c.label.toLowerCase().includes(q)) {
      hits.push({ id: c.id, label: c.label, layer: c.layer, kind: 'concept', conceptLabel: 'Entity type', plots: c.records });
    }
  }
  for (const r of g.doc.records) {
    if (!r.label.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) continue;
    const concept = g.conceptById.get(r.concept);
    hits.push({
      id: r.id,
      label: r.label,
      layer: concept?.layer ?? 'hierarchy',
      kind: 'record',
      conceptLabel: concept?.label ?? '',
      plots: r.usage.plots ?? 0,
      scope: concept?.label_scope ? r.attrs[concept.label_scope] : undefined,
    });
  }
  return hits
    .sort((a, b) => {
      const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || b.plots - a.plots || a.label.localeCompare(b.label);
    })
    .slice(0, limit);
}

/** Undirected hop distances. Navigation is not causation, so the router ignores direction. */
export function hopDistances(g: Indexed, start: string, maxHops = 3): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const n = queue.shift()!;
    const d = dist.get(n)!;
    if (d >= maxHops) continue;
    for (const e of g.neighbours.get(n) ?? []) {
      if (!dist.has(e.other)) {
        dist.set(e.other, d + 1);
        queue.push(e.other);
      }
    }
  }
  return dist;
}

export interface RouteStep {
  from: string;
  to: string;
  rel: string;
  forward: boolean;
  plots?: number;
}

export function shortestPath(g: Indexed, from: string, to: string): RouteStep[] | null {
  if (from === to) return [];
  const prev = new Map<string, { node: string; edge: Edge }>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const n = queue.shift()!;
    const edges = [...(g.neighbours.get(n) ?? [])].sort(
      (a, b) => a.other.localeCompare(b.other) || a.rel.localeCompare(b.rel),
    );
    for (const e of edges) {
      if (seen.has(e.other)) continue;
      seen.add(e.other);
      prev.set(e.other, { node: n, edge: e });
      if (e.other === to) {
        const steps: RouteStep[] = [];
        let cur = to;
        while (cur !== from) {
          const p = prev.get(cur)!;
          steps.unshift({ from: p.node, to: cur, rel: p.edge.rel, forward: p.edge.forward, plots: p.edge.plots });
          cur = p.node;
        }
        return steps;
      }
      queue.push(e.other);
    }
  }
  return null;
}

/* ------------------------------------------------------------------ loading */

export async function loadDocument(tenant = 'demo'): Promise<GraphDoc> {
  const inline = document.getElementById('graph-data');
  if (inline?.textContent) return JSON.parse(inline.textContent) as GraphDoc;

  /*
   * Order of attempts, and why. A static deployment has a document sitting next to index.html and no
   * API at all, so asking the API first would log a 404 on every load of the common case. Asking for a
   * specific tenant in the URL is explicit intent, and only the API can answer it.
   */
  const asked = new URLSearchParams(window.location.search).has('tenant');
  const viaApi = `/api/graph?tenant=${encodeURIComponent(tenant)}`;
  const attempts = asked ? [viaApi, './graph.json', '/graph.json'] : ['./graph.json', viaApi, '/graph.json'];
  const problems: string[] = [];
  for (const url of attempts) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        problems.push(`${url} -> ${res.status}`);
        continue;
      }
      return (await res.json()) as GraphDoc;
    } catch (err) {
      problems.push(`${url} -> ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`could not load a graph document. Tried: ${problems.join(', ')}`);
}

/* --------------------------------------------------------------- formatting */

export const fmt = (n: number): string =>
  Number.isInteger(n) ? n.toLocaleString('en-IN') : String(Math.round(n * 100) / 100);

export const layerColour = (layer: string): string => `var(--layer-${layer})`;

/** Metric keys the panel knows how to caption. Anything else falls back to its raw key. */
export const METRIC_LABELS: Record<string, string> = {
  plots: 'Plots',
  growers: 'Growers',
  projects: 'Projects',
  expected: 'Expected yield',
  achieved: 'Achieved yield',
  gap_pct: 'Gap',
  used_on: 'Times used',
  area_pct: 'Mean area impacted',
  warnings: 'Warnings fired',
  hit_rate: 'Hit rate',
  lead_days: 'Mean lead time',
  configured_days: 'Configured duration',
  observed_days: 'Observed duration',
  deviation_pct: 'Deviation',
};

export const PERCENT_METRICS = new Set(['gap_pct', 'area_pct', 'hit_rate', 'deviation_pct']);
export const SIGNED_METRICS = new Set(['gap_pct', 'deviation_pct']);
