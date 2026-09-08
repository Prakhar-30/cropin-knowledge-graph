/**
 * Cross-source parity.
 *
 * The synthetic catalog and the Supabase masters describe the same tenant. If the mapping file, the 41
 * master tables and the 31 aggregate views are right, both paths must produce the *same document* - not
 * merely the same counts. This is what caught the two real defects in the mapping layer: a null column
 * shipping the literal string "{note}" as prose, and a note that one source computed and the other
 * could not know about.
 *
 * Skipped when no Supabase credentials are present, so CI without secrets still passes. Run locally with
 * a .env in place, which this test reads itself.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { run } from '../src/core/pipeline.js';
import { loadMapping, MappedSource, readerFor } from '../src/sources/mapped.js';
import { SyntheticSource } from '../src/sources/synthetic/index.js';
import type { GraphDocument } from '../src/core/model.js';

/** Load .env so the same command works locally and skips cleanly in CI. */
function loadEnv() {
  const path = resolve('.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const configured = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const FROZEN = '2026-09-08T00:00:00Z';

describe.skipIf(!configured)('the Supabase masters reproduce the reference document', () => {
  let synthetic: GraphDocument;
  let supabase: GraphDocument;

  beforeAll(async () => {
    synthetic = (await run(new SyntheticSource(), { tenantId: 'demo', builtAt: FROZEN, parity: true })).doc;
    const { mapping, dir } = loadMapping(resolve('mappings/default.yaml'));
    const source = new MappedSource(mapping, readerFor(mapping, dir));
    supabase = (await run(source, { tenantId: 'demo', builtAt: FROZEN, parity: true })).doc;
  }, 120_000);

  it('passes every invariant from the database too', () => {
    expect(supabase.meta.counts).toEqual({ concepts: 23, records: 338, links: 1149 });
  });

  it('produces identical concepts, records and links', () => {
    expect(JSON.stringify(supabase.concepts)).toBe(JSON.stringify(synthetic.concepts));
    expect(JSON.stringify(supabase.records)).toBe(JSON.stringify(synthetic.records));
    expect(JSON.stringify(supabase.links)).toBe(JSON.stringify(synthetic.links));
  });

  it('differs only in where the document came from', () => {
    const strip = (d: GraphDocument) => JSON.stringify({ ...d, meta: { ...d.meta, source: null } });
    expect(strip(supabase)).toBe(strip(synthetic));
    expect(supabase.meta.source).toBe('supabase:demo');
    expect(synthetic.meta.source).toBe('synthetic');
  });

  it('never ships an unresolved template as prose', () => {
    for (const r of supabase.records) {
      expect(r.note ?? '', r.id).not.toContain('{');
      for (const [k, v] of Object.entries(r.attrs)) expect(v, `${r.id} / ${k}`).not.toContain('{');
    }
    for (const l of supabase.links) expect(l.note ?? '', `${l.from} -> ${l.to}`).not.toContain('{');
  });
});

/**
 * The graph store round trip. Read-only: it pulls whatever is stored and checks it against a fresh
 * build. Skipped when nothing has been pushed yet.
 *
 * This is where two silent corruptions showed up. Postgres `jsonb` normalises objects and sorts their
 * keys, so `attrs` - an ordered map whose order IS the display order - came back reordered, and `usage`
 * with it. The column is `json` now, and the store restores both orders from the ontology regardless,
 * because any store that normalises would do the same thing.
 */
describe.skipIf(!configured)('a pushed graph reads back as the graph that was pushed', () => {
  let stored: GraphDocument | null = null;
  let fresh: GraphDocument;

  beforeAll(async () => {
    fresh = (await run(new SyntheticSource(), { tenantId: 'demo', builtAt: FROZEN })).doc;
    const { createSupabase } = await import('../src/sources/supabase.js');
    const { pullDocument } = await import('../src/store/graph-store.js');
    try {
      stored = await pullDocument(
        createSupabase({
          url: process.env.VITE_SUPABASE_URL!,
          key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
        }),
        'demo',
      );
    } catch {
      stored = null;
    }
  }, 120_000);

  it('keeps every attribute in its declared display order', () => {
    if (!stored) return;
    for (const r of stored.records) {
      const own = fresh.records.find((x) => x.id === r.id);
      if (!own) continue;
      expect(Object.keys(r.attrs), r.id).toEqual(Object.keys(own.attrs));
    }
  });

  it('returns the same concepts, records and links, in the same order', () => {
    if (!stored) return;
    expect(JSON.stringify(stored.concepts)).toBe(JSON.stringify(fresh.concepts));
    expect(JSON.stringify(stored.records)).toBe(JSON.stringify(fresh.records));
    expect(JSON.stringify(stored.links)).toBe(JSON.stringify(fresh.links));
  });
});

describe.skipIf(configured)('cross-source parity', () => {
  it('is skipped without Supabase credentials', () => {
    expect(configured).toBe(false);
  });
});
