/**
 * Traversal over the graph. Shared by the build (invariant 9), the CLI (explain, route) and the viewer.
 *
 * Two rules, from the reachability finding:
 *   - The router traverses undirected. Navigation is not causation, and directed reachability is only
 *     around 70 percent, which is correct rather than a defect.
 *   - The semantics stay directional. Every result carries which way the edge was actually stored, so a
 *     panel can say "Crop it belongs to" in one direction and "Varieties configured" in the other.
 *
 * Record membership of a concept is treated as an implicit edge here. The decision on whether it is an
 * edge or an attribute was left open by the brief; it is an attribute in the document (records carry
 * `concept`) and an edge for traversal, so concepts are reachable without adding 338 rows to `links`.
 */

export interface TraversableRecord {
  id: string;
  concept: string;
}
export interface TraversableLink {
  from: string;
  to: string;
  rel: string;
  plots?: number;
}
export interface TraversableGraph {
  records: readonly TraversableRecord[];
  links: readonly TraversableLink[];
  concepts?: readonly { id: string }[];
}

export const MEMBERSHIP_REL = 'record of';

export interface Edge {
  /** The node on the other end of this edge from the node whose adjacency list it came from. */
  other: string;
  rel: string;
  /** true when the edge is stored pointing away from this node. */
  forward: boolean;
  plots?: number;
}

export interface Adjacency {
  /** Undirected adjacency, for navigation and reachability. */
  neighbours: Map<string, Edge[]>;
  outgoing: Map<string, TraversableLink[]>;
  incoming: Map<string, TraversableLink[]>;
  nodes: string[];
}

export function buildAdjacency(graph: TraversableGraph, includeMembership = true): Adjacency {
  const neighbours = new Map<string, Edge[]>();
  const outgoing = new Map<string, TraversableLink[]>();
  const incoming = new Map<string, TraversableLink[]>();
  const nodes = new Set<string>();

  const push = <T>(m: Map<string, T[]>, k: string, v: T) => {
    const list = m.get(k);
    if (list) list.push(v);
    else m.set(k, [v]);
  };

  for (const c of graph.concepts ?? []) nodes.add(c.id);
  for (const r of graph.records) {
    nodes.add(r.id);
    nodes.add(r.concept);
  }

  const addEdge = (l: TraversableLink) => {
    nodes.add(l.from);
    nodes.add(l.to);
    push(outgoing, l.from, l);
    push(incoming, l.to, l);
    push(neighbours, l.from, { other: l.to, rel: l.rel, forward: true, plots: l.plots });
    push(neighbours, l.to, { other: l.from, rel: l.rel, forward: false, plots: l.plots });
  };

  for (const l of graph.links) addEdge(l);
  if (includeMembership) {
    for (const r of graph.records) addEdge({ from: r.id, to: r.concept, rel: MEMBERSHIP_REL });
  }

  return { neighbours, outgoing, incoming, nodes: [...nodes].sort() };
}

/** Connected components over the undirected view. */
export function components(adj: Adjacency): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const start of adj.nodes) {
    if (seen.has(start)) continue;
    const group: string[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const n = queue.shift()!;
      group.push(n);
      for (const e of adj.neighbours.get(n) ?? []) {
        if (!seen.has(e.other)) {
          seen.add(e.other);
          queue.push(e.other);
        }
      }
    }
    out.push(group.sort());
  }
  return out.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

/** Hop distance from a node to every node it can reach, undirected. */
export function hopDistances(adj: Adjacency, start: string, maxHops = Infinity): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const n = queue.shift()!;
    const d = dist.get(n)!;
    if (d >= maxHops) continue;
    for (const e of adj.neighbours.get(n) ?? []) {
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

/** Shortest path, undirected, deterministic: neighbours are visited in sorted id order. */
export function shortestPath(adj: Adjacency, from: string, to: string): RouteStep[] | null {
  if (from === to) return [];
  const prev = new Map<string, { node: string; edge: Edge }>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const n = queue.shift()!;
    const edges = [...(adj.neighbours.get(n) ?? [])].sort(
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

export interface ReachabilityReport {
  componentCount: number;
  largestComponent: number;
  unreachable: string[];
  longestPath: number;
  meanPath: number;
  sampledPairs: number;
}

/**
 * Reachability sweep. Exhaustive BFS from every node when the graph is small enough, which it is at these
 * sizes, so the mean and longest figures are exact rather than sampled.
 */
export function reachability(adj: Adjacency): ReachabilityReport {
  const comps = components(adj);
  let longest = 0;
  let total = 0;
  let pairs = 0;
  for (const n of adj.nodes) {
    const dist = hopDistances(adj, n);
    for (const [m, d] of dist) {
      if (m === n) continue;
      longest = Math.max(longest, d);
      total += d;
      pairs += 1;
    }
  }
  const inLargest = new Set(comps[0] ?? []);
  return {
    componentCount: comps.length,
    largestComponent: comps[0]?.length ?? 0,
    unreachable: adj.nodes.filter((n) => !inLargest.has(n)),
    longestPath: longest,
    meanPath: pairs ? Math.round((total / pairs) * 10) / 10 : 0,
    sampledPairs: pairs,
  };
}
