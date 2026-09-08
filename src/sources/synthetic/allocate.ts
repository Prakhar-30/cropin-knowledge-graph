/**
 * Exact-sum allocation.
 *
 * The evidence rule says a variety plot count is entered by hand and every split of it is derived. That
 * only holds if the splits re-sum exactly, so shares are turned into integers by largest remainder rather
 * than by rounding each one independently. Deterministic: ties break on the declared order.
 */

export interface Share<T extends string = string> {
  key: T;
  share: number;
}

export function allocate<T extends string>(total: number, shares: Share<T>[]): Array<{ key: T; value: number }> {
  if (shares.length === 0) return [];
  const sum = shares.reduce((a, s) => a + s.share, 0);
  if (sum <= 0) throw new Error('allocate: shares must sum to more than zero');

  const exact = shares.map((s) => (s.share / sum) * total);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = total - floors.reduce((a, v) => a + v, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const out = shares.map((s, i) => ({ key: s.key, value: floors[i] }));
  for (const { i } of order) {
    if (remainder <= 0) break;
    out[i].value += 1;
    remainder -= 1;
  }
  return out;
}

/** A share of a whole that is not a partition - overlapping sets, so it must never be summed as a total. */
export function pctOf(total: number, pct: number): number {
  return Math.round((total * pct) / 100);
}
