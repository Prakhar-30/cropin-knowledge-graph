import { beforeAll, describe, expect, it } from 'vitest';
import { run, type RunResult } from '../src/core/pipeline.js';
import { buildAdjacency, hopDistances, shortestPath } from '../src/core/traverse.js';
import { parseCsv } from '../src/sources/csv.js';
import { interpolate } from '../src/mapping/apply.js';
import { assertReadOnly, MappingSchema } from '../src/mapping/spec.js';
import { SyntheticSource } from '../src/sources/synthetic/index.js';

let demo: RunResult;
beforeAll(async () => {
  demo = await run(new SyntheticSource(), { tenantId: 'demo', builtAt: '2026-09-08T00:00:00Z' });
});

describe('traversal', () => {
  it('routes undirected while keeping the direction of every step', () => {
    const adj = buildAdjacency(demo.doc);
    const path = shortestPath(adj, 'variety:lady_rosetta', 'resource_or_input:cold_store_space');
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
    for (const step of path!) expect(typeof step.forward).toBe('boolean');
    // A route exists in the navigation sense even though causation only runs one way.
    const reversed = shortestPath(adj, 'resource_or_input:cold_store_space', 'variety:lady_rosetta');
    expect(reversed!.length).toBe(path!.length);
  });

  it('reaches every populated node from the biggest hub', () => {
    const adj = buildAdjacency(demo.doc);
    const dist = hopDistances(adj, 'crop:potato');
    const unreachable = demo.doc.records.filter((r) => !dist.has(r.id)).map((r) => r.id);
    expect(unreachable).toEqual([]);
  });

  it('is deterministic', () => {
    const adj = buildAdjacency(demo.doc);
    const a = shortestPath(adj, 'crop:potato', 'form:harvest_and_grading');
    const b = shortestPath(adj, 'crop:potato', 'form:harvest_and_grading');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('csv parsing', () => {
  it('handles quotes, commas inside fields, and typed values', () => {
    const rows = parseCsv('a,b,c\n1,"x, y",true\n2,"say ""hi""",\n');
    expect(rows).toEqual([
      { a: 1, b: 'x, y', c: true },
      { a: 2, b: 'say "hi"', c: null },
    ]);
  });
});

describe('the mapping layer', () => {
  it('interpolates columns and slugs', () => {
    expect(interpolate('variety:{slug:name}', { name: 'Kufri Chipsona-1' })).toBe('variety:kufri_chipsona_1');
    expect(interpolate('{a} and {b}', { a: 'x', b: 2 })).toBe('x and 2');
    expect(interpolate('{missing}', { a: 1 })).toBe('{missing}');
  });

  it('rejects anything that is not a plain table read', () => {
    const mapping = MappingSchema.parse({
      version: 1,
      tenant_id: 'acme',
      source: 'csv',
      directory: '.',
      records: [{ concept: 'crop', from: 'crop_master; drop table crop_master', id: 'crop:{key}', label: '{name}' }],
    });
    expect(() => assertReadOnly(mapping)).toThrow(/not a plain table read/);
  });
});
