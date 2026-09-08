/**
 * Re-validating an emitted document.
 *
 * `cropin-graph validate graph.json` strips the derived numbers, recomputes them from the links, and
 * compares. Two things have to hold: a good document passes, and a tampered one fails - otherwise the
 * command is only checking the file against itself.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { build } from '../src/core/build.js';
import { derive } from '../src/core/derive.js';
import { fromDocument, toDocument } from '../src/core/emit.js';
import type { GraphDocument } from '../src/core/model.js';
import { run } from '../src/core/pipeline.js';
import { validate } from '../src/core/validate.js';
import { SyntheticSource } from '../src/sources/synthetic/index.js';

const FROZEN = '2026-09-08T00:00:00Z';
let doc: GraphDocument;

beforeAll(async () => {
  doc = (await run(new SyntheticSource(), { tenantId: 'demo', builtAt: FROZEN })).doc;
});

const revalidate = (d: GraphDocument) => {
  const { bundle, claimed } = fromDocument(d);
  const graph = build(bundle);
  derive(graph);
  return { graph, result: validate(graph, { parity: true, claimed }) };
};

describe('a document round trips', () => {
  it('passes every invariant when re-derived from its own links', () => {
    const { result } = revalidate(doc);
    const failed = result.checks.filter((c) => !c.ok);
    expect(failed.map((c) => `${c.n}. ${c.name}: ${c.offenders.join('; ')}`)).toEqual([]);
  });

  it('recomputes the same document byte for byte', () => {
    const { graph } = revalidate(doc);
    const again = toDocument(graph, { builtAt: FROZEN, reach: revalidate(doc).result.reach });
    expect(JSON.stringify(again)).toBe(JSON.stringify(doc));
  });

  it('strips the derived numbers rather than trusting them', () => {
    const { bundle, claimed } = fromDocument(doc);
    // alert_type.plots is a rollup, so it must not survive into the rebuilt source.
    const alert = bundle.records.find((r) => r.id === 'alert_type:frost')!;
    expect(alert.usage.plots).toBeUndefined();
    expect(alert.usage.area_pct).toBe(14.8);
    expect(claimed.metrics.get('alert_type:frost.plots')).toBe(1400);
    // A primary number is not stripped; it is the input everything else is derived from.
    const variety = bundle.records.find((r) => r.id === 'variety:kufri_pukhraj')!;
    expect(variety.usage.plots).toBe(3482);
    expect(claimed.metrics.get('variety:kufri_pukhraj.gap_pct')).toBe(-4.3);
  });
});

describe('a tampered document is caught', () => {
  it('fails when a derived total does not match the links behind it', () => {
    const tampered = structuredClone(doc);
    tampered.records.find((r) => r.id === 'crop:potato')!.usage.plots = 9999;
    const { result } = revalidate(tampered);
    const check = result.checks.find((c) => c.n === 16)!;
    expect(check.ok).toBe(false);
    expect(check.offenders.join(' ')).toContain('crop:potato.plots');
    expect(result.ok).toBe(false);
  });

  it('fails when a generated summary has been edited by hand', () => {
    const tampered = structuredClone(doc);
    tampered.records.find((r) => r.id === 'variety:lady_rosetta')!.summary = 'Looks fine to me.';
    const { result } = revalidate(tampered);
    const check = result.checks.find((c) => c.n === 16)!;
    expect(check.ok).toBe(false);
    expect(check.offenders.join(' ')).toContain('variety:lady_rosetta');
  });

  it('fails when a link weight has been changed under a total', () => {
    const tampered = structuredClone(doc);
    const link = tampered.links.find((l) => l.rel === 'variety of' && l.from === 'variety:kufri_pukhraj')!;
    link.plots = 1;
    const { result } = revalidate(tampered);

    // This is the division of labour between the two checks, and it is why both exist.
    //
    // Check 8 recomputes each total from the links and compares. After a re-derive the crop total was
    // rebuilt from the tampered link, so the two now agree with each other and check 8 is satisfied -
    // it can only ever prove internal consistency.
    expect(result.checks.find((c) => c.n === 8)!.ok).toBe(true);

    // Check 16 compares against what the document claimed, which is the only place the edit shows up.
    const claimedCheck = result.checks.find((c) => c.n === 16)!;
    expect(claimedCheck.ok).toBe(false);
    expect(claimedCheck.offenders.join(' ')).toContain('crop:potato.plots');
    expect(result.ok).toBe(false);
  });
});
