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

describe.skipIf(configured)('cross-source parity', () => {
  it('is skipped without Supabase credentials', () => {
    expect(configured).toBe(false);
  });
});
