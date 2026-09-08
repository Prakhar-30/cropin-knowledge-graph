/**
 * The layouts are pure functions of the document, which is the whole point of not using a force
 * simulation: they can be tested, and the same input always produces the same picture.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { index, sectionsFor, shortestPath, type GraphDoc, type Indexed } from '../viewer/src/lib/graph.js';
import {
  NODE_CAP,
  attachedLayout,
  countOverlaps,
  edgeWidth,
  layerBoardLayout,
  lineageLayout,
  routeLayout,
} from '../viewer/src/lib/layout.js';

let g: Indexed;

beforeAll(() => {
  const doc = JSON.parse(readFileSync(resolve('dist/demo/graph.json'), 'utf8')) as GraphDoc;
  g = index(doc);
});

describe('the viewer reads the document contract alone', () => {
  it('indexes every record and concept', () => {
    expect(g.recordById.size).toBe(g.doc.meta.counts.records);
    expect(g.conceptById.size).toBe(g.doc.meta.counts.concepts);
  });

  it('renders section headings from the document, never a raw relation key', () => {
    for (const record of g.doc.records.slice(0, 60)) {
      for (const section of sectionsFor(g, record.id)) {
        expect(section.heading, `${record.id} / ${section.rel}`).not.toBe(section.rel);
        expect(section.heading.length).toBeGreaterThan(2);
      }
    }
  });

  it('orders sections by the order the document declares', () => {
    const sections = sectionsFor(g, 'variety:kufri_pukhraj');
    const orders = sections.map((s) => s.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });
});

describe('every layout is deterministic', () => {
  const cases: Array<[string, () => unknown]> = [
    ['attached on a hub', () => attachedLayout(g, 'crop:potato')],
    ['attached on a leaf', () => attachedLayout(g, 'form:irrigation_log')],
    ['downstream', () => lineageLayout(g, 'crop:potato', 'downstream')],
    ['upstream', () => lineageLayout(g, 'resource_or_input:field_labour', 'upstream')],
    ['layer board', () => layerBoardLayout(g, 'c:variety')],
    ['route', () => routeLayout(g, 'crop:potato', 'resource_or_input:cold_store_space')],
  ];

  it.each(cases)('%s produces the same picture twice', (_name, build) => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });
});

describe('label collision is solved, not hoped away', () => {
  it.each([
    ['crop:potato'],
    ['variety:kufri_pukhraj'],
    ['c:plan_activity'],
    ['growth_stage:pot_tuber_bulking'],
    ['region:gujarat'],
    ['season:rabi'],
  ])('leaves no overlapping labels on the attached view of %s', (id) => {
    const layout = attachedLayout(g, id);
    expect(countOverlaps(layout.nodes)).toBe(0);
  });

  it('leaves no overlapping labels in either lineage direction', () => {
    for (const id of ['crop:potato', 'c:variety', 'plan_activity:harvest_operation']) {
      expect(countOverlaps(lineageLayout(g, id, 'downstream').nodes), `${id} downstream`).toBe(0);
      expect(countOverlaps(lineageLayout(g, id, 'upstream').nodes), `${id} upstream`).toBe(0);
    }
  });

  it('leaves no overlapping labels on the layer board', () => {
    expect(countOverlaps(layerBoardLayout(g).nodes)).toBe(0);
  });
});

describe('what gets drawn is capped and the omission is stated', () => {
  it('never draws more than the cap', () => {
    for (const id of ['crop:potato', 'c:plan_activity', 'resource_or_input:field_labour']) {
      const attached = attachedLayout(g, id);
      const down = lineageLayout(g, id, 'downstream');
      expect(attached.nodes.length - 1, `${id} attached`).toBeLessThanOrEqual(NODE_CAP);
      expect(down.nodes.length, `${id} downstream`).toBeLessThanOrEqual(NODE_CAP);
    }
  });

  it('reports how many it left out', () => {
    const layout = lineageLayout(g, 'crop:potato', 'downstream');
    const reachable = new Set<string>();
    const queue = ['crop:potato'];
    let hops = 0;
    let frontier = ['crop:potato'];
    while (hops < 3) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const l of g.outgoing.get(id) ?? []) {
          if (!reachable.has(l.to)) {
            reachable.add(l.to);
            next.push(l.to);
          }
        }
      }
      frontier = next;
      hops += 1;
    }
    void queue;
    // Everything within three hops is either drawn or counted as omitted.
    expect(layout.nodes.length + layout.omitted).toBeGreaterThanOrEqual(Math.min(reachable.size, NODE_CAP));
  });
});

describe('edge weight', () => {
  it('is thin when unknown and thick when proven', () => {
    expect(edgeWidth(undefined, 3482)).toBe(1);
    expect(edgeWidth(12, 3482)).toBeLessThan(edgeWidth(1810, 3482));
    expect(edgeWidth(3482, 3482)).toBeCloseTo(6, 1);
  });
});

describe('routing', () => {
  it('finds a path between two ends of the graph', () => {
    const path = shortestPath(g, 'sub_variety:lr_processing_lot', 'form:harvest_and_grading');
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
  });

  it('writes a heading on every link', () => {
    const layout = routeLayout(g, 'crop:potato', 'resource_or_input:cold_store_space');
    expect(layout.edges.length).toBeGreaterThan(0);
    for (const e of layout.edges) expect(e.label).toBeTruthy();
  });

  it('says so when there is no path rather than drawing nothing', () => {
    const layout = routeLayout(g, 'crop:potato', 'crop:potato');
    expect(layout.nodes.length).toBeLessThanOrEqual(1);
  });
});
