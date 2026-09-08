/**
 * Stage 3 of the pipeline: assemble the in-memory graph.
 *
 * Build knows nothing about derivation, validation or emission. It fails hard only on the things that
 * make everything after it meaningless - a duplicate record id, a record pointing at a concept that does
 * not exist, or a mapping that supplies a number the ontology says is derived. Everything else is
 * reported by validate, with the offending ids named.
 */
import { conceptKeyOf, isConceptId } from './ids.js';
import type { GraphRecord, Link, SourceBundle } from './model.js';
import { ontology } from './ontology.js';
import { buildAdjacency, type Adjacency } from './traverse.js';

export class BuildError extends Error {
  constructor(problems: string[]) {
    super(`build failed:\n  - ${problems.join('\n  - ')}`);
    this.name = 'BuildError';
  }
}

export interface BuiltGraph {
  tenantId: string;
  snapshot: string;
  sourceName: string;
  records: GraphRecord[];
  recordById: Map<string, GraphRecord>;
  links: Link[];
  byConcept: Map<string, GraphRecord[]>;
  adj: Adjacency;
  metricsNotComputed: string[];
}

/** Sort order for the emitted document. Deterministic, so two builds diff cleanly. */
export function sortRecords(records: GraphRecord[]): GraphRecord[] {
  return [...records].sort((a, b) => a.id.localeCompare(b.id));
}

export function sortLinks(links: Link[]): Link[] {
  return [...links].sort(
    (a, b) =>
      (ontology.relationByKey.get(a.rel)?.order ?? 999) - (ontology.relationByKey.get(b.rel)?.order ?? 999) ||
      a.rel.localeCompare(b.rel) ||
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to),
  );
}

export function build(bundle: SourceBundle): BuiltGraph {
  const problems: string[] = [];

  const recordById = new Map<string, GraphRecord>();
  for (const r of bundle.records) {
    if (recordById.has(r.id)) {
      problems.push(`duplicate record id "${r.id}"`);
      continue;
    }
    const concept = ontology.conceptById.get(r.concept);
    if (!concept) {
      problems.push(`record "${r.id}" points at unknown concept "${r.concept}"`);
      continue;
    }
    if (conceptKeyOf(r.id) !== concept.key) {
      problems.push(`record "${r.id}" has a prefix that is not its concept key "${concept.key}"`);
      continue;
    }
    if (r.tenant_id !== bundle.tenant_id) {
      problems.push(`record "${r.id}" carries tenant "${r.tenant_id}" in a build for "${bundle.tenant_id}"`);
      continue;
    }
    // The evidence rule: a mapping may not supply a number the ontology derives.
    for (const metric of Object.keys(r.usage)) {
      if (ontology.derivedMetrics.has(`${concept.key}.${metric}`)) {
        problems.push(
          `record "${r.id}" supplies "${metric}", but derivations.yaml derives "${concept.key}.${metric}"`,
        );
      }
    }
    recordById.set(r.id, r);
  }

  if (problems.length) throw new BuildError(problems);

  const records = sortRecords([...recordById.values()]);
  const links = sortLinks(bundle.links);

  const byConcept = new Map<string, GraphRecord[]>();
  for (const c of ontology.concepts) byConcept.set(c.key, []);
  for (const r of records) byConcept.get(ontology.conceptById.get(r.concept)!.key)!.push(r);

  const adj = buildAdjacency({
    records: records.map((r) => ({ id: r.id, concept: r.concept })),
    links,
    concepts: ontology.concepts.map((c) => ({ id: `c:${c.key}` })),
  });

  return {
    tenantId: bundle.tenant_id,
    snapshot: bundle.source_snapshot,
    sourceName: bundle.source_name,
    records,
    recordById,
    links,
    byConcept,
    adj,
    metricsNotComputed: bundle.metrics_not_computed ?? [],
  };
}

/** The concept key a node id belongs to: its own key for a concept id, its record's concept otherwise. */
export function conceptOfNode(graph: BuiltGraph, id: string): string | null {
  if (isConceptId(id)) return ontology.conceptById.get(id)?.key ?? null;
  const rec = graph.recordById.get(id);
  return rec ? (ontology.conceptById.get(rec.concept)?.key ?? null) : null;
}

export function labelOfNode(graph: BuiltGraph, id: string): string {
  if (isConceptId(id)) return ontology.conceptById.get(id)?.label ?? id;
  return graph.recordById.get(id)?.label ?? id;
}
