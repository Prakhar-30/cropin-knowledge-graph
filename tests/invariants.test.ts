import { beforeAll, describe, expect, it } from 'vitest';
import { run, type RunResult } from '../src/core/pipeline.js';
import { PARITY } from '../src/core/validate.js';
import { SyntheticSource } from '../src/sources/synthetic/index.js';
import { CsvTableReader } from '../src/sources/csv.js';
import { loadMapping, MappedSource } from '../src/sources/mapped.js';
import { resolve } from 'node:path';

const FROZEN = '2026-09-08T00:00:00Z';

let demo: RunResult;

beforeAll(async () => {
  demo = await run(new SyntheticSource(), { tenantId: 'demo', builtAt: FROZEN, parity: true });
});

describe('the acceptance suite on the reference tenant', () => {
  it('passes every invariant', () => {
    const failed = demo.validation.checks.filter((c) => !c.ok);
    expect(
      failed.map((c) => `${c.n}. ${c.name}: ${c.offenders.join('; ')}`),
      'invariant failures',
    ).toEqual([]);
  });

  it.each([
    [1, 'No dangling endpoints'],
    [2, 'Every relation is registered'],
    [3, 'Every link matches an allowed concept pair'],
    [4, 'Cardinality holds'],
    [5, 'No orphan records'],
    [6, 'ID format and prefix agreement'],
    [7, 'No duplicate labels within a concept'],
    [8, 'Rollup, partition and cross check arithmetic'],
    [9, 'Single connected component'],
    [10, 'Parity with the prototype document'],
    [13, 'Every relation has both headings and an order'],
    [14, 'No tenant leakage'],
    [15, 'Attributes declared and in display order'],
  ])('runs invariant %i, %s', (n, name) => {
    const check = demo.validation.checks.find((c) => c.n === n);
    expect(check, `invariant ${n} did not run`).toBeDefined();
    expect(check!.name).toBe(name);
    expect(check!.ok).toBe(true);
  });

  it('reproduces the prototype document exactly (invariant 10)', () => {
    expect(demo.doc.meta.counts).toEqual(PARITY);
  });

  it('is a single connected component with the prototype mean path', () => {
    expect(demo.validation.reach.componentCount).toBe(1);
    expect(demo.validation.reach.unreachable).toEqual([]);
    expect(demo.validation.reach.meanPath).toBe(3.3);
  });
});

describe('idempotence (invariant 11)', () => {
  it('produces byte-identical output from unchanged input', async () => {
    const a = await run(new SyntheticSource(), { tenantId: 'demo', builtAt: FROZEN });
    const b = await run(new SyntheticSource(), { tenantId: 'demo', builtAt: FROZEN });
    expect(JSON.stringify(b.doc)).toBe(JSON.stringify(a.doc));
  });

  it('differs only in built_at when the timestamp moves', async () => {
    const a = await run(new SyntheticSource(), { tenantId: 'demo', builtAt: FROZEN });
    const b = await run(new SyntheticSource(), { tenantId: 'demo', builtAt: '2026-10-01T00:00:00Z' });
    expect(JSON.stringify({ ...b.doc, meta: { ...b.doc.meta, built_at: FROZEN } })).toBe(JSON.stringify(a.doc));
  });
});

describe('a tenant with masters but no operational history', () => {
  let acme: RunResult;

  beforeAll(async () => {
    const { mapping, dir } = loadMapping(resolve('mappings/acme-csv.yaml'));
    const reader = new CsvTableReader(resolve(dir, mapping.directory!));
    acme = await run(new MappedSource(mapping, reader), { tenantId: 'acme', builtAt: FROZEN });
  });

  it('still passes every invariant', () => {
    const failed = acme.validation.checks.filter((c) => !c.ok);
    expect(failed.map((c) => `${c.n}. ${c.name}: ${c.offenders.join('; ')}`)).toEqual([]);
  });

  it('reports the missing metric as coverage rather than failing', () => {
    expect(acme.doc.meta.coverage.metrics_not_computed).toContain('variety_grower_count');
    expect(acme.doc.records.find((r) => r.id === 'variety:kufri_pukhraj')!.usage.growers).toBeUndefined();
  });

  it('reports the concepts this tenant has no records for', () => {
    expect(acme.doc.meta.coverage.concepts_with_no_records).toContain('c:dews_history');
    expect(acme.doc.meta.coverage.concepts_with_no_records).not.toContain('c:variety');
  });

  it('leaves out a computed metric whose input is missing, and says so', () => {
    expect(acme.derived.skipped).toContain('variety:hd_2967.gap_pct');
    expect(acme.doc.records.find((r) => r.id === 'variety:hd_2967')!.usage.gap_pct).toBeUndefined();
  });

  it('never mixes another tenant in', () => {
    expect(acme.doc.records.map((r) => r.id)).not.toContain('crop:rice');
    expect(acme.graph.records.every((r) => r.tenant_id === 'acme')).toBe(true);
  });
});
