/**
 * Loads ontology/*.yaml and self-validates it. Everything downstream obeys this contract, so it is
 * checked once, hard, at load time: a broken ontology is a crash, never a warning.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { z } from 'zod';
import {
  ConceptSchema,
  DerivationsSchema,
  LayerSchema,
  RelationSchema,
  SummariesSchema,
  type Concept,
  type Derivations,
  type Layer,
  type Relation,
  type Summaries,
} from './model.js';
import { conceptId } from './ids.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ONTOLOGY_DIR = resolve(HERE, '../../ontology');

function readYaml(file: string): unknown {
  return YAML.parse(readFileSync(resolve(ONTOLOGY_DIR, file), 'utf8'));
}

export class OntologyError extends Error {
  constructor(problems: string[]) {
    super(`ontology is invalid:\n  - ${problems.join('\n  - ')}`);
    this.name = 'OntologyError';
  }
}

export interface Ontology {
  layers: Layer[];
  concepts: Concept[];
  relations: Relation[];
  derivations: Derivations;
  summaries: Summaries;
  layerByKey: Map<string, Layer>;
  conceptByKey: Map<string, Concept>;
  conceptById: Map<string, Concept>;
  relationByKey: Map<string, Relation>;
  /** `${relation}|${fromConcept}>${toConcept}` for every allowed pair. */
  allowedPairs: Set<string>;
  /** Metrics entered by hand, as `${concept}.${metric}`. */
  primaryMetrics: Set<string>;
  /** Metrics summed or computed, as `${concept}.${metric}`. */
  derivedMetrics: Set<string>;
}

/** Relation keys referenced by a summary template, with any |reverse modifier stripped. */
export function relationsInTemplate(template: string): string[] {
  const out: string[] = [];
  const re = /\{(?:top|top_weight|list|count|if):([^}|]+)(?:\|[a-z]+)*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) out.push(m[1].trim());
  return out;
}

function validate(o: Omit<Ontology, 'layerByKey' | 'conceptByKey' | 'conceptById' | 'relationByKey' | 'allowedPairs' | 'primaryMetrics' | 'derivedMetrics'>): string[] {
  const problems: string[] = [];
  const layerKeys = new Set(o.layers.map((l) => l.key));
  const conceptKeys = new Set(o.concepts.map((c) => c.key));
  const relationKeys = new Set(o.relations.map((r) => r.key));

  const dup = (label: string, keys: string[]) => {
    const seen = new Set<string>();
    for (const k of keys) {
      if (seen.has(k)) problems.push(`duplicate ${label} key "${k}"`);
      seen.add(k);
    }
  };
  dup('layer', o.layers.map((l) => l.key));
  dup('concept', o.concepts.map((c) => c.key));
  dup('relation', o.relations.map((r) => r.key));

  for (const c of o.concepts) {
    if (!layerKeys.has(c.layer)) problems.push(`concept "${c.key}" references unknown layer "${c.layer}"`);
    const seen = new Set<string>();
    for (const a of c.attr_order) {
      if (seen.has(a)) problems.push(`concept "${c.key}" repeats attribute "${a}" in attr_order`);
      seen.add(a);
    }
    if (c.label_scope && !c.attr_order.includes(c.label_scope)) {
      problems.push(`concept "${c.key}" scopes labels by "${c.label_scope}", which is not one of its attributes`);
    }
  }

  for (const r of o.relations) {
    for (const p of r.pairs) {
      if (!conceptKeys.has(p.from)) problems.push(`relation "${r.key}" pair references unknown concept "${p.from}"`);
      if (!conceptKeys.has(p.to)) problems.push(`relation "${r.key}" pair references unknown concept "${p.to}"`);
    }
  }

  // Derivations: a metric is primary or derived, never both.
  const primary = new Set<string>();
  for (const p of o.derivations.primary) {
    if (!conceptKeys.has(p.concept)) problems.push(`derivations.primary references unknown concept "${p.concept}"`);
    for (const m of p.metrics) {
      if (!o.concepts.find((c) => c.key === p.concept)?.primary_metrics.includes(m)) {
        problems.push(`derivations.primary lists "${p.concept}.${m}" but concepts.yaml does not declare it in primary_metrics`);
      }
      primary.add(`${p.concept}.${m}`);
    }
  }
  for (const c of o.concepts) {
    for (const m of c.primary_metrics) {
      if (!primary.has(`${c.key}.${m}`)) {
        problems.push(`concept "${c.key}" declares primary metric "${m}" that derivations.yaml does not list`);
      }
    }
  }

  const derived = new Set<string>();
  for (const r of o.derivations.rollups) {
    if (!conceptKeys.has(r.target_concept)) problems.push(`rollup references unknown concept "${r.target_concept}"`);
    for (const rel of r.via_relation) {
      if (!relationKeys.has(rel)) problems.push(`rollup for "${r.target_concept}.${r.metric}" references unknown relation "${rel}"`);
    }
    const path = `${r.target_concept}.${r.metric}`;
    if (primary.has(path)) problems.push(`"${path}" is both primary and a rollup; a metric may be one or the other`);
    if (derived.has(path)) problems.push(`"${path}" has more than one rollup rule`);
    derived.add(path);
  }
  for (const c of o.derivations.computed) {
    if (!conceptKeys.has(c.concept)) problems.push(`computed references unknown concept "${c.concept}"`);
    const path = `${c.concept}.${c.metric}`;
    if (primary.has(path)) problems.push(`"${path}" is both primary and computed`);
    if (derived.has(path)) problems.push(`"${path}" is derived twice`);
    derived.add(path);
  }
  for (const p of o.derivations.partitions) {
    if (!conceptKeys.has(p.of_concept)) problems.push(`partition "${p.name}" references unknown concept "${p.of_concept}"`);
    if (!relationKeys.has(p.via_relation)) problems.push(`partition "${p.name}" references unknown relation "${p.via_relation}"`);
    const rel = o.relations.find((r) => r.key === p.via_relation);
    if (rel && !rel.weighted) problems.push(`partition "${p.name}" uses unweighted relation "${p.via_relation}"; it can never sum`);
  }
  for (const x of o.derivations.cross_checks) {
    if (!relationKeys.has(x.link_relation)) problems.push(`cross check "${x.name}" references unknown relation "${x.link_relation}"`);
    for (const rel of x.on_target_via) {
      if (!relationKeys.has(rel)) problems.push(`cross check "${x.name}" references unknown relation "${rel}"`);
    }
  }

  for (const t of o.summaries.templates) {
    if (!conceptKeys.has(t.concept)) problems.push(`summary template references unknown concept "${t.concept}"`);
    for (const rel of relationsInTemplate(t.template)) {
      if (!relationKeys.has(rel)) problems.push(`summary for "${t.concept}" references unknown relation "${rel}"`);
    }
  }

  return problems;
}

function loadOntology(): Ontology {
  const layersDoc = z
    .object({ version: z.number(), layers: z.array(LayerSchema).min(1) })
    .parse(readYaml('layers.yaml'));
  const conceptsDoc = z
    .object({ version: z.number(), concepts: z.array(ConceptSchema).min(1) })
    .parse(readYaml('concepts.yaml'));
  const relationsDoc = z
    .object({ version: z.number(), cardinalities: z.array(z.string()).optional(), relations: z.array(RelationSchema).min(1) })
    .parse(readYaml('relations.yaml'));
  const derivations = DerivationsSchema.parse(readYaml('derivations.yaml'));
  const summaries = SummariesSchema.parse(readYaml('summaries.yaml'));

  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
  const concepts = conceptsDoc.concepts.map((c) => ({
    ...c,
    definition: clean(c.definition),
    decide: clean(c.decide),
  }));
  const layers = [...layersDoc.layers].sort((a, b) => a.order - b.order);
  const relations = [...relationsDoc.relations].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));

  const base = { layers, concepts, relations, derivations, summaries };
  const problems = validate(base);
  if (problems.length) throw new OntologyError(problems);

  const allowedPairs = new Set<string>();
  for (const r of relations) for (const p of r.pairs) allowedPairs.add(`${r.key}|${p.from}>${p.to}`);

  const primaryMetrics = new Set<string>();
  for (const p of derivations.primary) for (const m of p.metrics) primaryMetrics.add(`${p.concept}.${m}`);
  const derivedMetrics = new Set<string>();
  for (const r of derivations.rollups) derivedMetrics.add(`${r.target_concept}.${r.metric}`);
  for (const c of derivations.computed) derivedMetrics.add(`${c.concept}.${c.metric}`);

  return {
    ...base,
    layerByKey: new Map(layers.map((l) => [l.key, l])),
    conceptByKey: new Map(concepts.map((c) => [c.key, c])),
    conceptById: new Map(concepts.map((c) => [conceptId(c.key), c])),
    relationByKey: new Map(relations.map((r) => [r.key, r])),
    allowedPairs,
    primaryMetrics,
    derivedMetrics,
  };
}

/** Loaded and validated once, at import. */
export const ontology: Ontology = loadOntology();

export function sections(): Record<string, { order: number; forward: string; reverse: string; weighted: boolean }> {
  const out: Record<string, { order: number; forward: string; reverse: string; weighted: boolean }> = {};
  for (const r of ontology.relations) {
    out[r.key] = { order: r.order, forward: r.forward, reverse: r.reverse, weighted: r.weighted };
  }
  return out;
}

export function layerMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of ontology.layers) out[l.key] = l.label;
  return out;
}
