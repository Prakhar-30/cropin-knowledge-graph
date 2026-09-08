import { beforeAll, describe, expect, it } from 'vitest';
import { run, type RunResult } from '../src/core/pipeline.js';
import { evaluate } from '../src/core/expr.js';
import { allocate } from '../src/sources/synthetic/allocate.js';
import { singularise } from '../src/core/summaries.js';
import { ontology } from '../src/core/ontology.js';
import { SyntheticSource } from '../src/sources/synthetic/index.js';
import { VARIETIES } from '../src/sources/synthetic/catalog-core.js';

let demo: RunResult;
beforeAll(async () => {
  demo = await run(new SyntheticSource(), { tenantId: 'demo', builtAt: '2026-09-08T00:00:00Z' });
});

const rec = (id: string) => demo.doc.records.find((r) => r.id === id)!;

describe('the evidence rule', () => {
  it('sums a crop from its varieties and nowhere else', () => {
    const varieties = VARIETIES.filter((v) => v.crop === 'potato');
    const expected = varieties.reduce((a, v) => a + v.plots, 0);
    expect(rec('crop:potato').usage.plots).toBe(expected);
    expect(expected).toBe(8101);
  });

  it('re-sums every variety split back to the variety total', () => {
    for (const v of VARIETIES) {
      const id = `variety:${v.key}`;
      for (const rel of ['grown in region', 'grown in season', 'grown on soil', 'irrigated by']) {
        const sum = demo.doc.links
          .filter((l) => l.from === id && l.rel === rel)
          .reduce((a, l) => a + (l.plots ?? 0), 0);
        expect(sum, `${id} via ${rel}`).toBe(v.plots);
      }
    }
  });

  it('re-sums sub varieties back to their parent, where they exist', () => {
    for (const v of VARIETIES) {
      const subs = demo.doc.links.filter((l) => l.to === `variety:${v.key}` && l.rel === 'sub variety of');
      if (subs.length === 0) continue;
      expect(subs.reduce((a, l) => a + (l.plots ?? 0), 0), v.key).toBe(v.plots);
    }
  });

  it('keeps the crop level disease weight equal to the sum of its varieties', () => {
    for (const link of demo.doc.links.filter((l) => l.rel === 'prone to')) {
      const sum = demo.doc.links
        .filter((l) => l.to === link.to && l.rel === 'susceptible')
        .reduce((a, l) => a + (l.plots ?? 0), 0);
      expect(link.plots, link.to).toBe(sum);
    }
  });

  it('refuses a mapping that supplies a derived number', async () => {
    const source = {
      name: 'bad',
      async load() {
        const base = await new SyntheticSource().load({ tenantId: 'demo' });
        const crop = base.records.find((r) => r.id === 'crop:potato')!;
        crop.usage.plots = 99;
        return base;
      },
    };
    await expect(run(source, { tenantId: 'demo' })).rejects.toThrow(/derivations\.yaml derives "crop\.plots"/);
  });

  it('derives a metric for every concept the rules name', () => {
    for (const rule of ontology.derivations.rollups) {
      const records = demo.doc.records.filter((r) => r.concept === `c:${rule.target_concept}`);
      for (const r of records) expect(r.usage[rule.metric], `${r.id}.${rule.metric}`).toBeTypeOf('number');
    }
  });
});

describe('computed metrics', () => {
  it('computes the yield gap the way the rule says', () => {
    expect(rec('variety:kufri_pukhraj').usage.gap_pct).toBe(-4.3);
    expect(rec('variety:lady_rosetta').usage.gap_pct).toBe(-14.4);
  });

  it('computes stage deviation, signed', () => {
    expect(rec('stage_observation:so_potato_bulking_gujarat').usage.deviation_pct).toBe(-8.6);
    expect(rec('stage_observation:so_potato_bulking_uttar_pradesh').usage.deviation_pct).toBe(8.6);
  });
});

describe('the expression evaluator', () => {
  it('handles the arithmetic the rules use', () => {
    expect(evaluate('round((achieved - expected) / expected * 100, 1)', { achieved: 26.8, expected: 28 })).toBe(-4.3);
    expect(evaluate('a + b * c', { a: 1, b: 2, c: 3 })).toBe(7);
    expect(evaluate('(a + b) * -c', { a: 1, b: 2, c: 3 })).toBe(-9);
    expect(evaluate('abs(a - b)', { a: 1, b: 5 })).toBe(4);
  });

  it('returns null rather than a wrong number when an input is missing', () => {
    expect(evaluate('a / b', { a: 1 })).toBeNull();
    expect(evaluate('a / b', { a: 1, b: 0 })).toBeNull();
  });

  it('is not eval', () => {
    expect(() => evaluate('process.exit(1)', {})).toThrow();
    expect(() => evaluate('fetch(1)', {})).toThrow(/unknown function/);
    expect(() => evaluate('require("fs")', {})).toThrow(/unexpected character/);
  });
});

describe('exact-sum allocation', () => {
  it('always re-sums to the total', () => {
    for (const total of [1, 7, 100, 3482, 25761]) {
      for (const shares of [[41, 32, 14, 8, 5], [1, 1, 1], [99, 1], [100]]) {
        const parts = allocate(total, shares.map((share, i) => ({ key: `k${i}`, share })));
        expect(parts.reduce((a, p) => a + p.value, 0), `${total} over ${shares}`).toBe(total);
      }
    }
  });

  it('is deterministic', () => {
    const shares = [{ key: 'a', share: 1 }, { key: 'b', share: 1 }, { key: 'c', share: 1 }];
    expect(allocate(10, shares)).toEqual(allocate(10, shares));
  });
});

describe('generated summaries', () => {
  it('never leaves an unresolved slot behind', () => {
    for (const r of demo.doc.records) {
      if (!r.summary) continue;
      expect(r.summary, r.id).not.toMatch(/[{}]/);
      expect(r.summary, r.id).not.toContain('not available');
    }
  });

  it('agrees in number', () => {
    expect(singularise('1 crop plans')).toBe('1 crop plans');
    expect(singularise('1 varieties across 5 plots')).toBe('1 variety across 5 plots');
    expect(singularise('1 plots')).toBe('1 plot');
    expect(singularise('1 percent')).toBe('1 percent');
  });

  it('reads the branch that matches the data', () => {
    expect(rec('variety:heemsohna').summary).toContain('No disease recorded against it');
    expect(rec('variety:kufri_pukhraj').summary).toContain('Most often Late Blight');
    expect(rec('variety:kufri_bahar').summary).not.toContain('Most often');
    expect(rec('crop:maize').summary).toContain('No harvest grade configured');
  });
});
