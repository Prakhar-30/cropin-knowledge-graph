/**
 * Stage 5: validation - the acceptance suite.
 *
 * Every check reports the offending ids, not just a count, because a count tells you a build is broken
 * and an id tells you why. `--strict` (the default in CI) turns any failure into a non-zero exit.
 */
import { conceptOfNode, type BuiltGraph } from './build.js';
import type { ClaimedValues } from './emit.js';
import { RECORD_ID_RE, isConceptId } from './ids.js';
import { ontology } from './ontology.js';
import { components, reachability } from './traverse.js';

export interface Check {
  n: number;
  name: string;
  ok: boolean;
  detail: string;
  offenders: string[];
}

export interface ValidationResult {
  checks: Check[];
  ok: boolean;
  reach: ReturnType<typeof reachability>;
}

/** The prototype document these numbers were taken from. Parity is checked against them (invariant 10). */
export const PARITY = { concepts: 23, records: 338, links: 1149 };

const MAX_OFFENDERS = 20;

export function validate(
  graph: BuiltGraph,
  opts: { parity?: boolean; claimed?: ClaimedValues } = {},
): ValidationResult {
  const checks: Check[] = [];
  const add = (n: number, name: string, offenders: string[], detail: string) =>
    checks.push({ n, name, ok: offenders.length === 0, detail, offenders: offenders.slice(0, MAX_OFFENDERS) });

  const resolves = (id: string) => (isConceptId(id) ? ontology.conceptById.has(id) : graph.recordById.has(id));

  /* 1 - no dangling endpoints */
  const dangling: string[] = [];
  for (const l of graph.links) {
    if (!resolves(l.from)) dangling.push(`${l.rel}: from "${l.from}"`);
    if (!resolves(l.to)) dangling.push(`${l.rel}: to "${l.to}"`);
  }
  add(1, 'No dangling endpoints', dangling, `${graph.links.length} links resolved`);

  /* 2 - every relation is registered */
  const unregistered = [
    ...new Set(graph.links.filter((l) => !ontology.relationByKey.has(l.rel)).map((l) => l.rel)),
  ];
  add(2, 'Every relation is registered', unregistered, `${ontology.relations.length} relations in the ontology`);

  /* 3 - every link matches an allowed concept pair */
  const badPairs: string[] = [];
  for (const l of graph.links) {
    if (!ontology.relationByKey.has(l.rel)) continue;
    const from = conceptOfNode(graph, l.from);
    const to = conceptOfNode(graph, l.to);
    if (!from || !to) continue;
    if (!ontology.allowedPairs.has(`${l.rel}|${from}>${to}`)) {
      badPairs.push(`"${l.rel}" from ${from} to ${to} (${l.from} -> ${l.to})`);
    }
  }
  add(3, 'Every link matches an allowed concept pair', badPairs, `${ontology.allowedPairs.size} pairs declared`);

  /* 4 - cardinality holds */
  const cardinality: string[] = [];
  for (const rel of ontology.relations) {
    const links = graph.links.filter((l) => l.rel === rel.key);
    if (rel.cardinality === 'many_to_one' || rel.cardinality === 'one_to_one') {
      const bySource = new Map<string, string[]>();
      for (const l of links) bySource.set(l.from, [...(bySource.get(l.from) ?? []), l.to]);
      for (const [from, tos] of bySource) {
        if (tos.length > 1) cardinality.push(`"${rel.key}" is ${rel.cardinality} but ${from} points at ${tos.length} targets`);
      }
    }
    if (rel.cardinality === 'one_to_many' || rel.cardinality === 'one_to_one') {
      const byTarget = new Map<string, string[]>();
      for (const l of links) byTarget.set(l.to, [...(byTarget.get(l.to) ?? []), l.from]);
      for (const [to, froms] of byTarget) {
        if (froms.length > 1) cardinality.push(`"${rel.key}" is ${rel.cardinality} but ${to} is pointed at by ${froms.length} sources`);
      }
    }
  }
  add(4, 'Cardinality holds', cardinality, 'checked against every relation declaration');

  /* 5 - no orphan records */
  const orphans = graph.records
    .filter((r) => (graph.adj.outgoing.get(r.id)?.length ?? 0) + (graph.adj.incoming.get(r.id)?.length ?? 0) === 0)
    .map((r) => r.id);
  add(5, 'No orphan records', orphans, `${graph.records.length} records each carry at least one link`);

  /* 6 - id format and prefix agreement */
  const badIds: string[] = [];
  for (const r of graph.records) {
    if (!RECORD_ID_RE.test(r.id)) badIds.push(`"${r.id}" is not <concept_key>:<snake_key>`);
    const concept = ontology.conceptById.get(r.concept);
    if (concept && !r.id.startsWith(`${concept.key}:`)) badIds.push(`"${r.id}" does not start with "${concept.key}:"`);
  }
  add(6, 'ID format and prefix agreement', badIds, 'record ids derived from source keys, stable across rebuilds');

  /* 7 - no duplicate labels within a concept */
  const dupLabels: string[] = [];
  for (const [conceptKey, records] of graph.byConcept) {
    const scopeAttr = ontology.conceptByKey.get(conceptKey)?.label_scope;
    const seen = new Map<string, string>();
    for (const r of records) {
      const scope = scopeAttr ? (r.attrs[scopeAttr] ?? '') : '';
      const key = `${scope.toLowerCase()}|${r.label.toLowerCase()}`;
      const prior = seen.get(key);
      if (prior) {
        dupLabels.push(
          `${conceptKey}: "${r.label}"${scope ? ` within ${scopeAttr} "${scope}"` : ''} on both ${prior} and ${r.id}`,
        );
      } else seen.set(key, r.id);
    }
  }
  add(
    7,
    'No duplicate labels within a concept',
    dupLabels,
    'unique per concept, and per label_scope where the vocabulary is crop scoped',
  );

  /* 8 - rollup consistency, partitions, and cross checks, recomputed independently of the engine */
  const arithmetic: string[] = [];
  for (const rule of ontology.derivations.rollups) {
    const rels = new Set(rule.via_relation);
    for (const record of graph.byConcept.get(rule.target_concept) ?? []) {
      let expected = 0;
      for (const l of graph.links) {
        if (l.to === record.id && rels.has(l.rel) && typeof l.plots === 'number') expected += l.plots;
      }
      const actual = record.usage[rule.metric];
      if (actual !== expected) {
        arithmetic.push(`${record.id}.${rule.metric} is ${actual} but its links sum to ${expected}`);
      }
    }
  }
  for (const p of ontology.derivations.partitions) {
    for (const record of graph.byConcept.get(p.of_concept) ?? []) {
      const links = (p.direction === 'incoming' ? graph.adj.incoming.get(record.id) : graph.adj.outgoing.get(record.id)) ?? [];
      const relevant = links.filter((l) => l.rel === p.via_relation);
      if (relevant.length === 0 && p.only_when_present) continue;
      const sum = relevant.reduce((a, l) => a + (l.plots ?? 0), 0);
      const own = record.usage[p.metric];
      if (own !== undefined && sum !== own) {
        arithmetic.push(`${p.name}: ${record.id} has ${own} but the split sums to ${sum}`);
      }
    }
  }
  for (const x of ontology.derivations.cross_checks) {
    const via = new Set(x.on_target_via);
    for (const l of graph.links) {
      if (l.rel !== x.link_relation) continue;
      let expected = 0;
      for (const m of graph.links) {
        if (m.to === l.to && via.has(m.rel) && typeof m.plots === 'number') expected += m.plots;
      }
      if ((l.plots ?? 0) !== expected) {
        arithmetic.push(`${x.name}: "${x.link_relation}" into ${l.to} carries ${l.plots ?? 0} against a sum of ${expected}`);
      }
    }
  }
  add(8, 'Rollup, partition and cross check arithmetic', arithmetic, 'every derived total recomputed from the links');

  /* 9 - single connected component, undirected.
     Concepts the tenant has no records for are excluded: an unused concept is reported in
     meta.coverage, and counting it as an island would make every partial tenant fail this check. */
  const populated = new Set<string>(graph.records.map((r) => r.id));
  for (const [key, records] of graph.byConcept) if (records.length) populated.add(`c:${key}`);
  const comps = components(graph.adj).map((c) => c.filter((n) => populated.has(n))).filter((c) => c.length);
  // Report the component count over populated nodes only, so every consumer of this figure agrees.
  const reach = { ...reachability(graph.adj), componentCount: comps.length };
  add(
    9,
    'Single connected component',
    comps.length > 1 ? comps.slice(1).map((c) => `${c.length} node island starting at ${c[0]}`) : [],
    `${comps.length} component, longest path ${reach.longestPath}, mean ${reach.meanPath} over ${reach.sampledPairs.toLocaleString('en-IN')} pairs`,
  );

  /* 10 - parity with the prototype */
  if (opts.parity) {
    const parity: string[] = [];
    if (ontology.concepts.length !== PARITY.concepts) parity.push(`${ontology.concepts.length} concepts, expected ${PARITY.concepts}`);
    if (graph.records.length !== PARITY.records) parity.push(`${graph.records.length} records, expected ${PARITY.records}`);
    if (graph.links.length !== PARITY.links) parity.push(`${graph.links.length} links, expected ${PARITY.links}`);
    add(10, 'Parity with the prototype document', parity, `${PARITY.concepts} concepts, ${PARITY.records} records, ${PARITY.links} links`);
  }

  /* 13 - every relation has both headings and an order */
  const headings = ontology.relations
    .filter((r) => !r.forward.trim() || !r.reverse.trim() || !Number.isInteger(r.order))
    .map((r) => r.key);
  add(13, 'Every relation has both headings and an order', headings, 'no raw relation key can reach the UI');

  /* 14 - no tenant leakage */
  const leaks = [
    ...graph.records.filter((r) => r.tenant_id !== graph.tenantId).map((r) => r.id),
    ...graph.links.filter((l) => l.tenant_id !== graph.tenantId).map((l) => `${l.from} -> ${l.to}`),
  ];
  add(14, 'No tenant leakage', leaks, `every row carries tenant "${graph.tenantId}"`);

  /* extra - attribute order matches the ontology */
  const attrOrder: string[] = [];
  for (const r of graph.records) {
    const concept = ontology.conceptById.get(r.concept)!;
    const declared = concept.attr_order;
    const keys = Object.keys(r.attrs);
    const unknown = keys.filter((k) => !declared.includes(k));
    if (unknown.length) attrOrder.push(`${r.id} has undeclared attributes: ${unknown.join(', ')}`);
    const ranks = keys.filter((k) => declared.includes(k)).map((k) => declared.indexOf(k));
    for (let i = 1; i < ranks.length; i += 1) {
      if (ranks[i] < ranks[i - 1]) {
        attrOrder.push(`${r.id} presents attributes out of the declared order`);
        break;
      }
    }
  }
  add(15, 'Attributes declared and in display order', attrOrder, 'attrs insertion order is the display order');

  /*
   * 16 - only when re-validating an emitted document. The derived numbers and generated summaries were
   * stripped on the way in and recomputed from the links, so this compares what the file claimed against
   * what its own links actually imply. A file that agrees only with itself has not been validated.
   */
  if (opts.claimed) {
    const drift: string[] = [];
    for (const [path, was] of opts.claimed.metrics) {
      const cut = path.lastIndexOf('.');
      const record = graph.recordById.get(path.slice(0, cut));
      const now = record?.usage[path.slice(cut + 1)];
      if (now === undefined) drift.push(`${path}: the document had ${was}, recomputing produced nothing`);
      else if (now !== was) drift.push(`${path}: the document had ${was}, its links imply ${now}`);
    }
    for (const [id, was] of opts.claimed.summaries) {
      const now = graph.recordById.get(id)?.summary;
      if (now !== was) drift.push(`${id}: the summary in the document is not the one its links generate`);
    }
    add(
      16,
      'Document numbers match what its own links imply',
      drift,
      `${opts.claimed.metrics.size} derived metrics and ${opts.claimed.summaries.size} summaries recomputed`,
    );
  }

  return { checks, ok: checks.every((c) => c.ok), reach };
}
