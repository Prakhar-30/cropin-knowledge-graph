/**
 * Four purpose-built deterministic layouts.
 *
 * No force simulation. Physics layouts jitter, overlap, and hand you a different picture every load,
 * which makes them useless for a graph people are meant to read the same way twice. Every position here
 * is a function of the data and the mode, so the same node lands in the same place every time.
 *
 * Label collision is solved rather than hoped away: a de-collision pass pushes nodes out along their own
 * angle (radial) or down their own column (columnar) until label boxes clear.
 *
 * What gets drawn is capped. Lineage from a hub can pull hundreds of nodes, and drawing them all shrinks
 * every label to nothing, so the cap is explicit and the number omitted is stated rather than hidden.
 */
import type { Indexed, Section } from './graph.js';
import { sectionsFor, shortestPath } from './graph.js';

export const NODE_CAP = 118;

export type Mode = 'attached' | 'downstream' | 'upstream' | 'layers' | 'route';

export interface LaidNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sub?: string;
  layer: string;
  r: number;
  kind: 'focus' | 'concept' | 'record';
  anchor: 'start' | 'middle' | 'end';
  /** Kept so the de-collision pass can push the node along its own angle. */
  angle?: number;
  radius?: number;
  column?: number;
  /** Which relation sector this node was placed in, so its heading can follow it outward. */
  sector?: string;
  plots?: number;
}

export interface LaidEdge {
  from: string;
  to: string;
  rel: string;
  plots?: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  label?: string;
  sublabel?: string;
  /** Vertical offset for the label, so neighbouring link labels do not collide. */
  labelLift?: number;
  dashed?: boolean;
}

export interface FloatLabel {
  x: number;
  y: number;
  text: string;
  anchor: 'start' | 'middle' | 'end';
  kind: 'sector' | 'column';
}

export interface Layout {
  mode: Mode;
  nodes: LaidNode[];
  edges: LaidEdge[];
  labels: FloatLabel[];
  omitted: number;
  caption: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  collisions: number;
}

/* ---------------------------------------------------------------- geometry */

const CHAR = 6.4;
const LABEL_H = 15;
const SUB_H = 13;
const PAD = 7;

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function labelBox(n: LaidNode): Box {
  const w = Math.max(n.label.length, n.sub?.length ?? 0) * CHAR + PAD * 2;
  const h = LABEL_H + (n.sub ? SUB_H : 0) + PAD;
  const cx = n.anchor === 'start' ? n.x + n.r + 6 + w / 2 : n.anchor === 'end' ? n.x - n.r - 6 - w / 2 : n.x;
  const cy = n.anchor === 'middle' ? n.y + n.r + 8 + h / 2 : n.y;
  return { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 };
}

const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

const polar = (angle: number, radius: number) => ({
  x: Math.cos((angle * Math.PI) / 180) * radius,
  y: Math.sin((angle * Math.PI) / 180) * radius,
});

/** Pushes each node outward along its own angle until its label box is clear. */
function decollideRadial(nodes: LaidNode[]): number {
  const placed: Box[] = [];
  let moved = 0;
  const order = [...nodes].sort((a, b) => (a.radius ?? 0) - (b.radius ?? 0));
  for (const n of order) {
    if (n.angle === undefined || n.radius === undefined) {
      placed.push(labelBox(n));
      continue;
    }
    let attempts = 0;
    for (;;) {
      const box = labelBox(n);
      if (!placed.some((p) => overlaps(box, p)) || attempts >= 60) {
        placed.push(box);
        break;
      }
      n.radius += 13;
      const p = polar(n.angle, n.radius);
      n.x = p.x;
      n.y = p.y;
      attempts += 1;
      moved += 1;
    }
  }
  return moved;
}

/**
 * Pushes each node down its own column until its label box is clear of every box already placed.
 *
 * The comparison has to be global rather than per column. A long record label - "Kufri Pukhraj, Uttar
 * Pradesh, Rabi 2024-25" is 42 characters - is wider than the gap between columns, so it reaches into
 * the neighbouring column and collides with a node that is nowhere near it in its own.
 */
function decollideColumns(nodes: LaidNode[]): number {
  let moved = 0;
  const placed: Box[] = [];
  const order = [...nodes].sort((a, b) => (a.column ?? a.x) - (b.column ?? b.x) || a.y - b.y);
  for (const n of order) {
    let attempts = 0;
    for (;;) {
      const box = labelBox(n);
      if (!placed.some((p) => overlaps(box, p)) || attempts >= 80) {
        placed.push(box);
        break;
      }
      n.y += 9;
      attempts += 1;
      moved += 1;
    }
  }
  return moved;
}

function boundsOf(nodes: LaidNode[], labels: FloatLabel[]): Layout['bounds'] {
  if (nodes.length === 0) return { minX: -300, minY: -200, maxX: 300, maxY: 200 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const b = labelBox(n);
    minX = Math.min(minX, b.x1, n.x - n.r);
    maxX = Math.max(maxX, b.x2, n.x + n.r);
    minY = Math.min(minY, b.y1, n.y - n.r);
    maxY = Math.max(maxY, b.y2, n.y + n.r);
  }
  for (const l of labels) {
    const w = l.text.length * CHAR;
    minX = Math.min(minX, l.x - w);
    maxX = Math.max(maxX, l.x + w);
    minY = Math.min(minY, l.y - 20);
    maxY = Math.max(maxY, l.y + 20);
  }
  return { minX, minY, maxX, maxY };
}

/** Edge thickness by historical plot count. Thick means proven, thin means experimental. */
export function edgeWidth(plots: number | undefined, maxPlots: number): number {
  if (!plots) return 1;
  return 1.1 + 4.9 * Math.sqrt(Math.min(plots, maxPlots) / maxPlots);
}

function nodeOf(g: Indexed, id: string, kind: LaidNode['kind'], anchor: LaidNode['anchor'], sub?: string): LaidNode {
  const concept = g.conceptOf(id);
  const isConcept = g.isConcept(id);
  return {
    id,
    x: 0,
    y: 0,
    label: g.labelOf(id),
    sub,
    layer: concept?.layer ?? 'hierarchy',
    r: kind === 'focus' ? 13 : isConcept ? 8.5 : 6,
    kind: kind === 'focus' ? 'focus' : isConcept ? 'concept' : 'record',
    anchor,
    plots: g.recordById.get(id)?.usage.plots,
  };
}

/* --------------------------------------------------------------- 1. attached */

/**
 * A radial wheel. Outgoing relationships on the right, incoming on the left, one relation label per
 * sector rather than per edge - sector grouping removed most of the visual clutter in a single change.
 */
export function attachedLayout(g: Indexed, focusId: string): Layout {
  const sections = sectionsFor(g, focusId);
  const focus = nodeOf(g, focusId, 'focus', 'middle');
  const nodes: LaidNode[] = [focus];
  const edges: LaidEdge[] = [];
  const labels: FloatLabel[] = [];

  // Concept membership, drawn as a section of its own so a record is never a dead end.
  const own = g.recordById.get(focusId);
  const extra: Section[] = [];
  if (own) {
    const concept = g.conceptById.get(own.concept)!;
    extra.push({
      key: 'out:record of',
      rel: 'record of',
      direction: 'out',
      heading: 'Entity type',
      order: -1,
      items: [{ id: concept.id, label: concept.label, layer: concept.layer }],
    });
  }
  if (g.isConcept(focusId)) {
    const records = g.recordsByConcept.get(focusId) ?? [];
    if (records.length) {
      extra.push({
        key: 'in:record of',
        rel: 'record of',
        direction: 'in',
        heading: `Records of this type`,
        order: -1,
        items: records
          .map((r) => ({ id: r.id, label: r.label, layer: g.layerOf(r.id), plots: r.usage.plots }))
          .sort((a, b) => (b.plots ?? -1) - (a.plots ?? -1) || a.label.localeCompare(b.label)),
      });
    }
  }

  const all = [...extra, ...sections];
  const out = all.filter((s) => s.direction === 'out');
  const inn = all.filter((s) => s.direction === 'in');

  // Share the cap between the two halves in proportion to what each is asking for.
  const asked = all.reduce((a, s) => a + s.items.length, 0);
  const budget = Math.min(asked, NODE_CAP);
  let omitted = 0;

  /** Sector headings are positioned after de-collision, from the nodes that ended up in them. */
  const sectors: Array<{ key: string; side: 'right' | 'left'; text: string }> = [];

  const place = (group: Section[], fromDeg: number, toDeg: number, side: 'right' | 'left') => {
    if (group.length === 0) return;
    const weights = group.map((s) => Math.sqrt(s.items.length) + 0.6);
    const totalWeight = weights.reduce((a, w) => a + w, 0);
    const span = toDeg - fromDeg;
    let cursor = fromDeg;

    group.forEach((section, si) => {
      const sectorSpan = (weights[si] / totalWeight) * span;
      const share = Math.max(1, Math.round((section.items.length / Math.max(asked, 1)) * budget));
      const shown = section.items.slice(0, Math.min(section.items.length, Math.max(share, 1)));
      omitted += section.items.length - shown.length;

      const perRing = Math.max(2, Math.floor(sectorSpan / 11));
      const sectorKey = `${side}:${si}`;
      const hidden = section.items.length - shown.length;
      sectors.push({
        key: sectorKey,
        side,
        text: `${section.heading} (${section.items.length})${hidden > 0 ? ` +${hidden} not drawn` : ''}`,
      });

      shown.forEach((item, i) => {
        const ring = Math.floor(i / perRing);
        const inRing = shown.slice(ring * perRing, (ring + 1) * perRing).length;
        const idx = i % perRing;
        const pad = sectorSpan / (inRing + 1);
        const angle = cursor + pad * (idx + 1);
        const radius = 205 + ring * 118;
        const n = nodeOf(
          g,
          item.id,
          'record',
          side === 'right' ? 'start' : 'end',
          item.plots === undefined ? undefined : `${item.plots.toLocaleString('en-IN')} plots`,
        );
        n.angle = angle;
        n.radius = radius;
        n.sector = sectorKey;
        const p = polar(angle, radius);
        n.x = p.x;
        n.y = p.y;
        nodes.push(n);
        edges.push({
          from: focusId,
          to: item.id,
          rel: section.rel,
          plots: item.plots,
          x1: 0,
          y1: 0,
          x2: n.x,
          y2: n.y,
          width: edgeWidth(item.plots, g.maxPlots),
          dashed: section.rel === 'record of',
        });
      });

      cursor += sectorSpan;
    });
  };

  place(out, -78, 78, 'right');
  place(inn, 102, 258, 'left');

  const collisions = decollideRadial(nodes.filter((n) => n.kind !== 'focus'));

  /*
   * One heading per sector, placed just beyond the widest label in that sector and vertically centred
   * on it. An earlier version pushed every heading to the widest point on its whole side, which flung
   * them to the canvas edges and left the graph itself small in the middle.
   */
  for (const sector of sectors) {
    const own = nodes.filter((n) => n.sector === sector.key);
    if (own.length === 0) continue;
    const dir = sector.side === 'right' ? 1 : -1;
    const reach = own.reduce(
      (a, n) => Math.max(a, Math.abs(n.x) + Math.max(n.label.length, n.sub?.length ?? 0) * CHAR + 16),
      0,
    );
    labels.push({
      x: dir * (reach + 18),
      y: own.reduce((a, n) => a + n.y, 0) / own.length,
      text: sector.text,
      anchor: sector.side === 'right' ? 'start' : 'end',
      kind: 'sector',
    });
  }

  // Headings on the same side must not sit on top of each other either.
  for (const side of ['start', 'end'] as const) {
    const column = labels.filter((l) => l.anchor === side).sort((a, b) => a.y - b.y);
    for (let i = 1; i < column.length; i += 1) {
      const gap = column[i].y - column[i - 1].y;
      if (gap < 22) column[i].y = column[i - 1].y + 22;
    }
  }

  return {
    mode: 'attached',
    nodes,
    edges,
    labels,
    omitted,
    caption: `${nodes.length - 1} attached across ${all.length} relationship${all.length === 1 ? '' : 's'}`,
    bounds: boundsOf(nodes, labels),
    collisions,
  };
}

/* -------------------------------------------------------- 2 and 3. lineage */

/**
 * Columns by hop distance, barycentre-ordered to reduce crossings, tall columns wrapped into
 * sub-columns. Downstream follows the direction the fact is stored in; upstream reads it backwards -
 * "what is this used by" against "what does this use".
 */
export function lineageLayout(g: Indexed, focusId: string, direction: 'downstream' | 'upstream'): Layout {
  const maxHops = 3;
  const forward = direction === 'downstream';
  const columns: string[][] = [[focusId]];
  const seen = new Set([focusId]);
  const linksBetween: Array<{ from: string; to: string; rel: string; plots?: number }> = [];

  for (let hop = 0; hop < maxHops; hop += 1) {
    const next: string[] = [];
    for (const id of columns[hop]) {
      const links = forward ? (g.outgoing.get(id) ?? []) : (g.incoming.get(id) ?? []);
      for (const l of links) {
        const other = forward ? l.to : l.from;
        linksBetween.push({ from: id, to: other, rel: l.rel, plots: l.plots });
        if (!seen.has(other)) {
          seen.add(other);
          next.push(other);
        }
      }
    }
    if (next.length === 0) break;
    columns.push(next);
  }

  // Cap by keeping the heaviest links first, so what survives is the proven part of the picture.
  let omitted = 0;
  let budget = NODE_CAP;
  const kept: string[][] = [];
  for (const column of columns) {
    const ranked = [...column].sort(
      (a, b) => (g.recordById.get(b)?.usage.plots ?? 0) - (g.recordById.get(a)?.usage.plots ?? 0) || a.localeCompare(b),
    );
    const take = ranked.slice(0, Math.max(0, budget));
    omitted += ranked.length - take.length;
    budget -= take.length;
    kept.push(take);
  }

  const keptSet = new Set(kept.flat());
  const COL_W = 330;
  const ROW_H = 40;
  const SUBCOL = 15;
  const nodes: LaidNode[] = [];
  const positions = new Map<string, { x: number; y: number }>();

  kept.forEach((column, hop) => {
    // Barycentre: order by the mean y of whatever this node is attached to one column back.
    const ordered = [...column].sort((a, b) => {
      const bary = (id: string) => {
        const parents = linksBetween
          .filter((l) => (forward ? l.to === id : l.from === id))
          .map((l) => positions.get(forward ? l.from : l.to)?.y)
          .filter((y): y is number => y !== undefined);
        return parents.length ? parents.reduce((x, y) => x + y, 0) / parents.length : 0;
      };
      return bary(a) - bary(b) || g.labelOf(a).localeCompare(g.labelOf(b));
    });

    ordered.forEach((id, i) => {
      const sub = Math.floor(i / SUBCOL);
      const rowsHere = ordered.slice(sub * SUBCOL, (sub + 1) * SUBCOL).length;
      const row = i % SUBCOL;
      const dir = forward ? 1 : -1;
      const x = dir * (hop * COL_W + sub * 190);
      const y = (row - (rowsHere - 1) / 2) * ROW_H;
      const rec = g.recordById.get(id);
      const n = nodeOf(
        g,
        id,
        hop === 0 ? 'focus' : 'record',
        forward ? 'start' : 'end',
        rec?.usage.plots === undefined ? undefined : `${rec.usage.plots.toLocaleString('en-IN')} plots`,
      );
      n.x = x;
      n.y = y;
      n.column = hop * 10 + sub;
      nodes.push(n);
      positions.set(id, { x, y });
    });
  });

  const collisions = decollideColumns(nodes);
  for (const n of nodes) positions.set(n.id, { x: n.x, y: n.y });

  const edges: LaidEdge[] = [];
  const drawn = new Set<string>();
  for (const l of linksBetween) {
    if (!keptSet.has(l.from) || !keptSet.has(l.to)) continue;
    const key = `${l.rel}|${l.from}|${l.to}`;
    if (drawn.has(key)) continue;
    drawn.add(key);
    const a = positions.get(l.from)!;
    const b = positions.get(l.to)!;
    edges.push({
      from: l.from,
      to: l.to,
      rel: l.rel,
      plots: l.plots,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      width: edgeWidth(l.plots, g.maxPlots),
    });
  }

  const labels: FloatLabel[] = kept.map((column, hop) => {
    const own = nodes.filter((n) => column.includes(n.id));
    const xs = own.map((n) => n.x);
    const ys = own.map((n) => n.y);
    return {
      x: xs.length ? (forward ? Math.min(...xs) : Math.max(...xs)) : 0,
      y: (ys.length ? Math.min(...ys) : 0) - 44,
      text: hop === 0 ? 'Starting point' : `${hop} hop${hop === 1 ? '' : 's'} ${forward ? 'out' : 'back'}`,
      anchor: forward ? 'start' : 'end',
      kind: 'column',
    };
  });

  return {
    mode: direction,
    nodes,
    edges,
    labels,
    omitted,
    caption: `${nodes.length} nodes across ${kept.length} hop${kept.length === 1 ? '' : 's'} ${forward ? 'downstream' : 'upstream'}`,
    bounds: boundsOf(nodes, labels),
    collisions,
  };
}

/* ---------------------------------------------------------- 4. layer board */

/**
 * A layer board: one column per layer, every entity type in it. This replaced a hairball whose labels
 * overlapped 86 times, and it is the view that answers "what is in this graph at all".
 */
export function layerBoardLayout(g: Indexed, focusId?: string): Layout {
  const COL_W = 286;
  const ROW_H = 78;
  const nodes: LaidNode[] = [];
  const labels: FloatLabel[] = [];

  g.doc.meta.layer_order.forEach((layer, li) => {
    const concepts = g.doc.concepts
      .filter((c) => c.layer === layer)
      .sort((a, b) => b.records - a.records || a.label.localeCompare(b.label));
    const x = li * COL_W;
    labels.push({ x, y: -66, text: g.doc.meta.layers[layer] ?? layer, anchor: 'middle', kind: 'column' });
    concepts.forEach((c, i) => {
      const n = nodeOf(g, c.id, focusId === c.id ? 'focus' : 'concept', 'middle', `${c.records} records`);
      n.x = x;
      n.y = i * ROW_H;
      n.column = li;
      nodes.push(n);
    });
  });

  const collisions = decollideColumns(nodes);
  return {
    mode: 'layers',
    nodes,
    edges: [],
    labels,
    omitted: 0,
    caption: `${nodes.length} entity types across ${g.doc.meta.layer_order.length} layers`,
    bounds: boundsOf(nodes, labels),
    collisions,
  };
}

/* ----------------------------------------------------------------- 5. route */

/** A shortest-path chain with the relationship written on every link. */
export function routeLayout(g: Indexed, from: string, to: string): Layout {
  const path = shortestPath(g, from, to);
  if (!path) {
    return {
      mode: 'route',
      nodes: [],
      edges: [],
      labels: [],
      omitted: 0,
      caption: 'no route between these two',
      bounds: { minX: -200, minY: -100, maxX: 200, maxY: 100 },
      collisions: 0,
    };
  }

  const ids = [from, ...path.map((s) => s.to)];
  const STEP_X = 250;
  const STEP_Y = 96;
  const nodes = ids.map((id, i) => {
    const n = nodeOf(g, id, i === 0 || i === ids.length - 1 ? 'focus' : 'record', 'start');
    n.x = i * STEP_X;
    n.y = i * STEP_Y;
    n.column = i;
    return n;
  });

  // Link labels alternate between two heights: a heading is usually wider than the gap it sits in, so
  // two neighbouring headings on one line would overlap.
  const edges: LaidEdge[] = path.map((step, i) => {
    const meta = g.doc.meta.sections[step.rel];
    const heading = meta ? (step.forward ? meta.forward : meta.reverse) : step.rel;
    return {
      from: step.from,
      to: step.to,
      rel: step.rel,
      plots: step.plots,
      x1: nodes[i].x,
      y1: nodes[i].y,
      x2: nodes[i + 1].x,
      y2: nodes[i + 1].y,
      width: edgeWidth(step.plots, g.maxPlots),
      label: heading,
      sublabel: step.plots ? `${step.plots.toLocaleString('en-IN')} plots behind it` : undefined,
      labelLift: 22,
      dashed: step.rel === 'record of',
    };
  });

  return {
    mode: 'route',
    nodes,
    edges,
    labels: [],
    omitted: 0,
    caption: `${path.length} hop${path.length === 1 ? '' : 's'} between them`,
    bounds: boundsOf(nodes, []),
    collisions: 0,
  };
}

/** How many label boxes still overlap after the de-collision pass. Reported, not hidden. */
export function countOverlaps(nodes: LaidNode[]): number {
  const boxes = nodes.map(labelBox);
  let n = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (overlaps(boxes[i], boxes[j])) n += 1;
    }
  }
  return n;
}
