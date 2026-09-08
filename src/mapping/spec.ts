/**
 * The mapping layer contract.
 *
 * The real platform schema is not known in detail, so no table or column name appears anywhere in
 * `src/`. A mapping file is the only thing a new tenant or a schema change touches.
 *
 * One entry per record type, one per link type, one per metric. There is no way to express a query per
 * row, so N+1 is impossible by construction rather than by review.
 */
import { z } from 'zod';

/** Where a number comes from: a column on the row, or a named metric aggregate. */
export const ValueSourceSchema = z.union([
  z.object({ from: z.literal('column'), name: z.string() }),
  z.object({ from: z.literal('metric'), name: z.string(), key: z.string().optional() }),
  z.object({ from: z.literal('constant'), value: z.number() }),
]);
export type ValueSource = z.infer<typeof ValueSourceSchema>;

export const RecordMappingSchema = z.object({
  concept: z.string(),
  /** Table or view to read. Aggregation belongs in a view, not here. */
  from: z.string(),
  where: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  /** Set false only for a genuinely global reference table, and say why in `note`. */
  tenant_scoped: z.boolean().default(true),
  id: z.string(),
  label: z.string(),
  attrs: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  note: z.string().optional(),
  usage: z.record(z.string(), ValueSourceSchema).default({}),
});
export type RecordMapping = z.infer<typeof RecordMappingSchema>;

export const MetricMappingSchema = z.object({
  name: z.string(),
  from: z.string(),
  key: z.string(),
  value: z.string(),
  where: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  tenant_scoped: z.boolean().default(true),
});
export type MetricMapping = z.infer<typeof MetricMappingSchema>;

export const LinkMappingSchema = z.object({
  rel: z.string(),
  from_table: z.string(),
  where: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  tenant_scoped: z.boolean().default(true),
  from: z.string(),
  to: z.string(),
  weight: ValueSourceSchema.optional(),
  note: z.string().optional(),
});
export type LinkMapping = z.infer<typeof LinkMappingSchema>;

export const MappingSchema = z.object({
  version: z.literal(1),
  tenant_id: z.string(),
  /** csv or supabase. The mapping itself is backend independent. */
  source: z.enum(['csv', 'supabase']),
  /** csv only: directory holding <table>.csv files. */
  directory: z.string().optional(),
  /** supabase only: env var names. Never a literal credential. */
  url_env: z.string().default('VITE_SUPABASE_URL'),
  key_env: z.string().default('VITE_SUPABASE_PUBLISHABLE_KEY'),
  snapshot: z.string().optional(),
  records: z.array(RecordMappingSchema).min(1),
  metrics: z.array(MetricMappingSchema).default([]),
  links: z.array(LinkMappingSchema).default([]),
});
export type Mapping = z.infer<typeof MappingSchema>;

/** Belt and braces: reject anything that looks like a write before it can reach a connection. */
const WRITE_WORDS = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i;

export function assertReadOnly(mapping: Mapping): void {
  const suspicious: string[] = [];
  const check = (where: string, text: string) => {
    if (WRITE_WORDS.test(text)) suspicious.push(`${where}: "${text}"`);
  };
  for (const r of mapping.records) check(`records[${r.concept}].from`, r.from);
  for (const m of mapping.metrics) check(`metrics[${m.name}].from`, m.from);
  for (const l of mapping.links) check(`links[${l.rel}].from_table`, l.from_table);
  if (suspicious.length) {
    throw new Error(`mapping contains something that is not a plain table read:\n  - ${suspicious.join('\n  - ')}`);
  }
}
