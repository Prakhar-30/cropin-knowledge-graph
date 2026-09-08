/**
 * Applies a mapping to rows: rows become records and links.
 *
 * Missing source data is a first-class outcome, not an exception. If a table is absent for a tenant the
 * records that do exist still build, the metric that could not be computed is left off, and the gap is
 * reported in `meta.coverage`. A tenant with masters but no operational history still gets a usable
 * configuration view.
 */
import { conceptId, slug } from '../core/ids.js';
import type { GraphRecord, Link } from '../core/model.js';
import { ontology } from '../core/ontology.js';
import type { Mapping, ValueSource } from './spec.js';
import type { Row, TableReader } from '../sources/table.js';

export interface ApplyResult {
  records: GraphRecord[];
  links: Link[];
  metricsNotComputed: string[];
  problems: string[];
}

/**
 * Formatters available inside a mapping template.
 *
 * `attrs` values are display-ready strings, so the presentation decision belongs here rather than in
 * SQL: a view should not have to know that this tenant reads numbers in Indian grouping. Aggregation
 * stays in the database, formatting stays in the mapping.
 */
const FORMATTERS: Record<string, (raw: string | number | boolean) => string> = {
  slug: (raw) => slug(String(raw)),
  /** Thousands separators, Indian grouping. */
  num: (raw) => Number(raw).toLocaleString('en-IN'),
  /** One decimal place, always shown. */
  one: (raw) => Number(raw).toFixed(1),
  /** Signed, one decimal place - for a deviation or a gap. */
  signed: (raw) => `${Number(raw) > 0 ? '+' : ''}${Number(raw).toFixed(1)}`,
  yesno: (raw) => (raw === true || raw === 'true' || raw === 1 ? 'Yes' : 'No'),
  upper: (raw) => String(raw).toUpperCase(),
};

/** `{col}`, or `{fn:col}` for any formatter above. An unresolved slot is left alone and reported. */
export function interpolate(template: string, row: Row): string {
  return template.replace(/\{([a-z]+:)?([a-zA-Z0-9_]+)\}/g, (whole, fn: string | undefined, col: string) => {
    const raw = row[col];
    if (raw === null || raw === undefined) return whole;
    if (!fn) return String(raw);
    const formatter = FORMATTERS[fn.slice(0, -1)];
    if (!formatter) throw new Error(`unknown formatter "${fn.slice(0, -1)}" in template "${template}"`);
    return formatter(raw);
  });
}

function readValue(
  src: ValueSource,
  row: Row,
  metrics: Map<string, Map<string, number>>,
  idKeyColumn: string | undefined,
): number | undefined {
  if (src.from === 'constant') return src.value;
  if (src.from === 'column') {
    const v = row[src.name];
    return v === null || v === undefined || v === '' ? undefined : Number(v);
  }
  const table = metrics.get(src.name);
  if (!table) return undefined;
  const keyColumn = src.key ?? idKeyColumn;
  if (!keyColumn) return undefined;
  const key = row[keyColumn];
  if (key === null || key === undefined) return undefined;
  return table.get(String(key));
}

export async function applyMapping(mapping: Mapping, reader: TableReader, tenantId: string): Promise<ApplyResult> {
  const problems: string[] = [];
  const metricsNotComputed: string[] = [];

  /* metrics first: one read each, reused by every record and link that names them */
  const metrics = new Map<string, Map<string, number>>();
  for (const m of mapping.metrics) {
    const rows = await reader.read(m.from, m.where, m.tenant_scoped ? tenantId : undefined);
    if (rows === null) {
      metricsNotComputed.push(m.name);
      continue;
    }
    const table = new Map<string, number>();
    for (const row of rows) {
      const key = row[m.key];
      const value = row[m.value];
      if (key === null || key === undefined || value === null || value === undefined) continue;
      table.set(String(key), Number(value));
    }
    metrics.set(m.name, table);
  }

  /* records */
  const records: GraphRecord[] = [];
  for (const spec of mapping.records) {
    const concept = ontology.conceptByKey.get(spec.concept);
    if (!concept) {
      problems.push(`mapping references unknown concept "${spec.concept}"`);
      continue;
    }
    const rows = await reader.read(spec.from, spec.where, spec.tenant_scoped ? tenantId : undefined);
    if (rows === null) {
      problems.push(`table "${spec.from}" is not available, so no ${concept.label} records were built`);
      continue;
    }
    for (const row of rows) {
      const id = interpolate(spec.id, row);
      if (!id.startsWith(`${concept.key}:`)) {
        problems.push(`record id "${id}" does not start with "${concept.key}:"`);
        continue;
      }
      const attrs: Record<string, string> = {};
      for (const a of spec.attrs) {
        const value = interpolate(a.value, row).trim();
        if (value && !value.includes('{')) attrs[a.key] = value;
      }
      const usage: Record<string, number> = {};
      for (const [metric, src] of Object.entries(spec.usage)) {
        const value = readValue(src, row, metrics, undefined);
        if (value !== undefined && Number.isFinite(value)) usage[metric] = value;
        else if (src.from === 'metric' && !metrics.has(src.name)) metricsNotComputed.push(`${concept.key}.${metric}`);
      }
      records.push({
        id,
        concept: conceptId(concept.key),
        label: interpolate(spec.label, row),
        attrs,
        usage,
        ...(spec.note ? { note: interpolate(spec.note, row) } : {}),
        tenant_id: tenantId,
      });
    }
  }

  /* links */
  const links: Link[] = [];
  for (const spec of mapping.links) {
    if (!ontology.relationByKey.has(spec.rel)) {
      problems.push(`mapping references unknown relation "${spec.rel}"`);
      continue;
    }
    const rows = await reader.read(spec.from_table, spec.where, spec.tenant_scoped ? tenantId : undefined);
    if (rows === null) {
      problems.push(`table "${spec.from_table}" is not available, so no "${spec.rel}" links were built`);
      continue;
    }
    for (const row of rows) {
      const from = interpolate(spec.from, row);
      const to = interpolate(spec.to, row);
      if (from.includes('{') || to.includes('{')) {
        problems.push(`"${spec.rel}" produced an unresolved endpoint: ${from} -> ${to}`);
        continue;
      }
      const plots = spec.weight ? readValue(spec.weight, row, metrics, undefined) : undefined;
      links.push({
        from,
        to,
        rel: spec.rel,
        ...(plots === undefined || !Number.isFinite(plots) ? {} : { plots: Math.round(plots) }),
        ...(spec.note ? { note: interpolate(spec.note, row) } : {}),
        tenant_id: tenantId,
      });
    }
  }

  return { records, links, metricsNotComputed: [...new Set(metricsNotComputed)].sort(), problems };
}
