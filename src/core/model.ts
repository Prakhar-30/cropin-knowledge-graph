/**
 * The canonical graph document.
 *
 * This is a contract. The viewer reads these exact field names. Additive changes are fine; renames and
 * removals are not. Anything emitted here is either global product knowledge (concepts, relations, layers)
 * or per-tenant data (records, links).
 */
import { z } from 'zod';
import { CONCEPT_ID_RE, RECORD_ID_RE } from './ids.js';

export const SCHEMA_VERSION = '1.0.0';

/* ------------------------------------------------------------------ ontology */

export const LayerSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  order: z.number().int(),
  blurb: z.string().default(''),
});
export type Layer = z.infer<typeof LayerSchema>;

export const ConceptSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  layer: z.string(),
  source: z.string().min(1),
  definition: z.string().min(1),
  decide: z.string().min(1),
  attr_order: z.array(z.string()).default([]),
  primary_metrics: z.array(z.string()).default([]),
  /**
   * Attribute whose value scopes label uniqueness. Growth stages, grades and diseases are crop-scoped
   * vocabularies: two crops may both have a stage called Harvest, and that is correct rather than a
   * collision. Absent means labels must be unique across the whole concept.
   */
  label_scope: z.string().optional(),
});
export type Concept = z.infer<typeof ConceptSchema>;

export const CARDINALITIES = ['one_to_one', 'one_to_many', 'many_to_one', 'many_to_many'] as const;
export type Cardinality = (typeof CARDINALITIES)[number];

export const RelationSchema = z.object({
  key: z.string().min(1),
  order: z.number().int(),
  forward: z.string().min(1),
  reverse: z.string().min(1),
  weighted: z.boolean(),
  cardinality: z.enum(CARDINALITIES),
  pairs: z.array(z.object({ from: z.string(), to: z.string() })).min(1),
});
export type Relation = z.infer<typeof RelationSchema>;

/* ---------------------------------------------------------------- derivation */

export const DerivationsSchema = z.object({
  version: z.number(),
  primary: z.array(z.object({ concept: z.string(), metrics: z.array(z.string()) })),
  rollups: z.array(
    z.object({
      target_concept: z.string(),
      metric: z.string(),
      rule: z.literal('sum_of_incoming_link_weight'),
      via_relation: z.array(z.string()).min(1),
    }),
  ),
  computed: z.array(z.object({ concept: z.string(), metric: z.string(), expr: z.string() })),
  partitions: z
    .array(
      z.object({
        name: z.string(),
        of_concept: z.string(),
        metric: z.string(),
        via_relation: z.string(),
        direction: z.enum(['outgoing', 'incoming']).default('outgoing'),
        only_when_present: z.boolean().default(true),
      }),
    )
    .default([]),
  cross_checks: z
    .array(
      z.object({
        name: z.string(),
        link_relation: z.string(),
        equals: z.literal('sum_of_incoming_link_weight'),
        on_target_via: z.array(z.string()).min(1),
      }),
    )
    .default([]),
});
export type Derivations = z.infer<typeof DerivationsSchema>;

export const SummariesSchema = z.object({
  version: z.number(),
  templates: z.array(z.object({ concept: z.string(), template: z.string().min(1) })),
});
export type Summaries = z.infer<typeof SummariesSchema>;

/* ------------------------------------------------------------ tenant records */

/** Raw numbers, used for sorting, bars and thresholds. Never formatted here. */
export const UsageSchema = z.record(z.string(), z.number());
export type Usage = z.infer<typeof UsageSchema>;

export const RecordSchema = z.object({
  id: z.string().regex(RECORD_ID_RE, 'record id must be <concept_key>:<snake_key>'),
  concept: z.string().regex(CONCEPT_ID_RE, 'concept reference must be c:<snake_key>'),
  label: z.string().min(1),
  /** Display-ready strings, in display order. Units belong in the string. */
  attrs: z.record(z.string(), z.string()).default({}),
  note: z.string().optional(),
  summary: z.string().optional(),
  usage: UsageSchema.default({}),
  tenant_id: z.string().min(1),
});
export type GraphRecord = z.infer<typeof RecordSchema>;

export const LinkSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  rel: z.string().min(1),
  /**
   * Historical co-occurrence count; drives edge thickness. Absent rather than zero when the count is
   * genuinely unknown, and that gap is recorded in meta.coverage.
   */
  plots: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
  tenant_id: z.string().min(1),
});
export type Link = z.infer<typeof LinkSchema>;

/* -------------------------------------------------------- emitted document */

export const SectionSchema = z.object({
  order: z.number().int(),
  forward: z.string(),
  reverse: z.string(),
  weighted: z.boolean(),
});

export const MetaSchema = z.object({
  schema_version: z.string(),
  tenant_id: z.string(),
  built_at: z.string(),
  source_snapshot: z.string(),
  source: z.string(),
  layers: z.record(z.string(), z.string()),
  layer_order: z.array(z.string()),
  sections: z.record(z.string(), SectionSchema),
  counts: z.object({ concepts: z.number(), records: z.number(), links: z.number() }),
  evidence_rule: z.string(),
  coverage: z.object({
    concepts_with_no_records: z.array(z.string()),
    records_with_no_links: z.array(z.string()),
    unweighted_links: z.number(),
    metrics_not_computed: z.array(z.string()),
  }),
  graph: z
    .object({ components: z.number(), longest_path: z.number(), mean_path: z.number() })
    .optional(),
});
export type Meta = z.infer<typeof MetaSchema>;

export const EmittedConceptSchema = z.object({
  id: z.string().regex(CONCEPT_ID_RE),
  key: z.string(),
  label: z.string(),
  layer: z.string(),
  definition: z.string(),
  decide: z.string(),
  source: z.string(),
  label_scope: z.string().optional(),
  records: z.number().int().nonnegative(),
});

export const GraphDocumentSchema = z.object({
  meta: MetaSchema,
  concepts: z.array(EmittedConceptSchema),
  records: z.array(RecordSchema.omit({ tenant_id: true })),
  links: z.array(LinkSchema.omit({ tenant_id: true })),
});
export type GraphDocument = z.infer<typeof GraphDocumentSchema>;

/* --------------------------------------------------------- in-memory graph */

/** What a source hands to the builder. No derived numbers, no summaries. */
export interface SourceBundle {
  tenant_id: string;
  source_snapshot: string;
  source_name: string;
  records: GraphRecord[];
  links: Link[];
  /** Metrics the source could not compute for this tenant, recorded in meta.coverage. */
  metrics_not_computed?: string[];
}

export const EVIDENCE_RULE =
  'Only variety, sub variety, crop plan, sowing window, alert, observation and DEWS metrics are entered. ' +
  'Every other total on this graph is summed from the links at build time, so no two numbers here can ' +
  'contradict each other. Edge thickness is the historical plot count behind the pairing: a thick link is ' +
  'a proven combination, a thin one is an experiment.';
