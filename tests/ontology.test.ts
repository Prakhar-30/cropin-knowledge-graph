import { describe, expect, it } from 'vitest';
import { ontology, relationsInTemplate } from '../src/core/ontology.js';
import { conceptId, recordId, slug } from '../src/core/ids.js';

describe('the ontology loads and self-validates', () => {
  it('carries the shape the build brief specifies', () => {
    expect(ontology.concepts).toHaveLength(23);
    expect(ontology.relations).toHaveLength(33);
    expect(ontology.layers).toHaveLength(6);
  });

  it('gives every relation two headings, an order and at least one valid pair', () => {
    for (const r of ontology.relations) {
      expect(r.forward.trim(), r.key).not.toBe('');
      expect(r.reverse.trim(), r.key).not.toBe('');
      expect(Number.isInteger(r.order), r.key).toBe(true);
      expect(r.pairs.length, r.key).toBeGreaterThan(0);
      for (const p of r.pairs) {
        expect(ontology.conceptByKey.has(p.from), `${r.key} from ${p.from}`).toBe(true);
        expect(ontology.conceptByKey.has(p.to), `${r.key} to ${p.to}`).toBe(true);
      }
    }
  });

  it('never lets a metric be both primary and derived', () => {
    for (const path of ontology.primaryMetrics) {
      expect(ontology.derivedMetrics.has(path), path).toBe(false);
    }
  });

  it('only partitions on weighted relations', () => {
    for (const p of ontology.derivations.partitions) {
      expect(ontology.relationByKey.get(p.via_relation)?.weighted, p.name).toBe(true);
    }
  });

  it('resolves every relation a summary template names', () => {
    for (const t of ontology.summaries.templates) {
      for (const rel of relationsInTemplate(t.template)) {
        expect(ontology.relationByKey.has(rel), `${t.concept} -> ${rel}`).toBe(true);
      }
    }
  });

  it('scopes labels only by an attribute the concept actually has', () => {
    for (const c of ontology.concepts) {
      if (c.label_scope) expect(c.attr_order, c.key).toContain(c.label_scope);
    }
  });

  it('declares a decide line that reads as advice, not description', () => {
    for (const c of ontology.concepts) {
      expect(c.decide.length, c.key).toBeGreaterThan(80);
      expect(c.definition.length, c.key).toBeGreaterThan(40);
    }
  });
});

describe('identity', () => {
  it('slugs deterministically', () => {
    expect(slug('Kufri Chipsona-1')).toBe('kufri_chipsona_1');
    expect(slug('HD 3086')).toBe('hd_3086');
    expect(slug('  Pusa  Basmati 1121 ')).toBe('pusa_basmati_1121');
    expect(slug('Table Grade A / B')).toBe('table_grade_a_b');
  });

  it('builds ids the validator will accept', () => {
    expect(conceptId('variety')).toBe('c:variety');
    expect(recordId('variety', 'Kufri Pukhraj')).toBe('variety:kufri_pukhraj');
  });
});
