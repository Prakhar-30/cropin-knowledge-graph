/**
 * The graph store: push a built document to Supabase, or read one back.
 *
 * This is the one place in the project that writes, and it writes only to its own kg_* tables - never
 * back to a platform master. A push replaces the tenant's graph wholesale, because the document is
 * derived and a partial update would leave two halves of two builds side by side.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { compareLinks } from '../core/build.js';
import { GraphDocumentSchema, type GraphDocument } from '../core/model.js';
import { layerMap, ontology, sections } from '../core/ontology.js';

const CHUNK = 500;

export interface PushReport {
  concepts: number;
  records: number;
  links: number;
}

async function insertChunked(client: SupabaseClient, table: string, rows: unknown[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await client.from(table).insert(rows.slice(i, i + CHUNK) as never);
    if (error) throw new Error(`insert into ${table} failed: ${error.message} (${error.code ?? 'no code'})`);
  }
}

export async function pushDocument(client: SupabaseClient, doc: GraphDocument): Promise<PushReport> {
  const t = doc.meta.tenant_id;
  for (const table of ['kg_links', 'kg_records', 'kg_concepts', 'kg_builds']) {
    const { error } = await client.from(table).delete().eq('tenant_id', t);
    if (error) {
      throw new Error(
        `clearing ${table} failed: ${error.message}. A push needs a key that can write - set SUPABASE_SERVICE_ROLE_KEY, or use "cropin-graph sql --what graph" and run the SQL instead.`,
      );
    }
  }

  await insertChunked(client, 'kg_concepts', doc.concepts.map((c) => ({
    tenant_id: t, id: c.id, key: c.key, label: c.label, layer: c.layer,
    definition: c.definition, decide: c.decide, source: c.source,
    label_scope: c.label_scope ?? null, records: c.records,
  })));
  await insertChunked(client, 'kg_records', doc.records.map((r) => ({
    tenant_id: t, id: r.id, concept: r.concept, label: r.label,
    attrs: r.attrs, usage: r.usage, note: r.note ?? null, summary: r.summary ?? null,
  })));
  await insertChunked(client, 'kg_links', doc.links.map((l) => ({
    tenant_id: t, from_id: l.from, to_id: l.to, rel: l.rel,
    plots: l.plots ?? null, note: l.note ?? null,
  })));
  await insertChunked(client, 'kg_builds', [{
    tenant_id: t, built_at: doc.meta.built_at, schema_version: doc.meta.schema_version,
    source: doc.meta.source, source_snapshot: doc.meta.source_snapshot,
    meta: doc.meta, counts: doc.meta.counts,
  }]);

  return { concepts: doc.concepts.length, records: doc.records.length, links: doc.links.length };
}

/**
 * Restores the declared attribute order on the way out of the store.
 *
 * `attrs` is an ordered map whose insertion order is the display order. The column is `json` so the
 * order survives, but this does not rely on that: any store that normalises objects - jsonb, a document
 * database, a JSON column in another engine - would reorder them, and the ontology is the authority on
 * the order anyway. Cheap insurance in one place, rather than a rule every store has to remember.
 */
function orderAttrs(conceptId: string, attrs: Record<string, string>): Record<string, string> {
  const declared = ontology.conceptById.get(conceptId)?.attr_order ?? [];
  const out: Record<string, string> = {};
  for (const key of declared) if (attrs[key] !== undefined) out[key] = attrs[key];
  for (const [key, value] of Object.entries(attrs)) if (!(key in out)) out[key] = value;
  return out;
}

/** Metric order carries no meaning, but emit sorts it, so the store has to sort it the same way. */
function orderUsage(usage: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(usage).sort()) out[key] = usage[key];
  return out;
}

async function readAll(client: SupabaseClient, table: string, tenantId: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from(table).select('*').eq('tenant_id', tenantId).range(offset, offset + 999);
    if (error) throw new Error(`reading ${table} failed: ${error.message}`);
    out.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < 1000) return out;
  }
}

/**
 * Reads a stored document back. `meta` is stored whole on the build row, so a pull returns exactly what
 * was pushed - except that the ontology half of meta is refreshed from the repo, since concepts and
 * relation display headings are product knowledge rather than tenant data.
 */
export async function pullDocument(client: SupabaseClient, tenantId: string): Promise<GraphDocument> {
  const builds = await readAll(client, 'kg_builds', tenantId);
  if (builds.length === 0) throw new Error(`no graph stored for tenant "${tenantId}"`);
  const latest = builds.sort((a, b) => String(b.built_at).localeCompare(String(a.built_at)))[0];

  const [concepts, records, links] = await Promise.all([
    readAll(client, 'kg_concepts', tenantId),
    readAll(client, 'kg_records', tenantId),
    readAll(client, 'kg_links', tenantId),
  ]);

  const meta = latest.meta as GraphDocument['meta'];
  const doc = {
    meta: {
      ...meta,
      layers: layerMap(),
      layer_order: ontology.layers.map((l) => l.key),
      sections: sections(),
    },
    /*
     * Concepts come back in the ontology's own order, not sorted by id. The ontology is the authority on
     * concept order and emit uses it, so anything else would make a pulled document differ from the one
     * that was pushed.
     */
    concepts: ontology.concepts
      .map((own) => {
        const stored = concepts.find((c) => String(c.id) === `c:${own.key}`);
        return {
          id: `c:${own.key}`, key: own.key, label: own.label, layer: own.layer,
          definition: own.definition, decide: own.decide, source: own.source,
          ...(own.label_scope ? { label_scope: own.label_scope } : {}),
          records: Number(stored?.records ?? 0),
        };
      }),
    records: records
      .map((r) => ({
        id: String(r.id), concept: String(r.concept), label: String(r.label),
        attrs: orderAttrs(String(r.concept), (r.attrs ?? {}) as Record<string, string>),
        usage: orderUsage((r.usage ?? {}) as Record<string, number>),
        ...(r.note ? { note: String(r.note) } : {}),
        ...(r.summary ? { summary: String(r.summary) } : {}),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    links: links
      .map((l) => ({
        from: String(l.from_id), to: String(l.to_id), rel: String(l.rel),
        ...(l.plots === null || l.plots === undefined ? {} : { plots: Number(l.plots) }),
        ...(l.note ? { note: String(l.note) } : {}),
      }))
      .sort(compareLinks),
  };

  return GraphDocumentSchema.parse(doc);
}

export async function listTenants(client: SupabaseClient): Promise<Array<{ tenant_id: string; built_at: string; counts: unknown }>> {
  const { data, error } = await client.from('kg_builds').select('tenant_id, built_at, counts').order('built_at', { ascending: false });
  if (error) throw new Error(`listing tenants failed: ${error.message}`);
  return (data ?? []) as Array<{ tenant_id: string; built_at: string; counts: unknown }>;
}
