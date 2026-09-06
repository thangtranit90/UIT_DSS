// TOPSIS ranking engine — ported from the reference utils/algorithm.py.

export interface Ranked<T> {
  item: T;
  score: number; // 0..100 closeness to the ideal
  rank: number;
  normalized: Record<string, number>;
}

export function topsis<T>(
  items: T[],
  getCriteria: (t: T) => Record<string, number>,
  weights: Record<string, number>,
  costKeys: Set<string>
): Ranked<T>[] {
  const keys = Object.keys(weights);
  if (items.length === 0) return [];

  const values = items.map((it) => keys.map((k) => Number(getCriteria(it)[k] ?? 0)));

  // Normalize weights.
  let wArr = keys.map((k) => Math.max(weights[k], 0));
  const wSum = wArr.reduce((a, b) => a + b, 0);
  wArr = wSum === 0 ? keys.map(() => 1 / keys.length) : wArr.map((w) => w / wSum);

  // Vector normalization per column.
  const denom = keys.map((_, j) =>
    Math.sqrt(values.reduce((a, row) => a + row[j] * row[j], 0))
  );
  const norm = values.map((row) => row.map((v, j) => (denom[j] ? v / denom[j] : 0)));
  const weighted = norm.map((row) => row.map((v, j) => v * wArr[j]));

  // Ideal best / worst (swap for cost criteria).
  const best = keys.map((k, j) => {
    const col = weighted.map((r) => r[j]);
    return costKeys.has(k) ? Math.min(...col) : Math.max(...col);
  });
  const worst = keys.map((k, j) => {
    const col = weighted.map((r) => r[j]);
    return costKeys.has(k) ? Math.max(...col) : Math.min(...col);
  });

  const scored = items.map((item, i) => {
    const dPos = Math.sqrt(weighted[i].reduce((a, v, j) => a + (v - best[j]) ** 2, 0));
    const dNeg = Math.sqrt(weighted[i].reduce((a, v, j) => a + (v - worst[j]) ** 2, 0));
    const d = dPos + dNeg;
    const score = d === 0 ? 50 : (dNeg / d) * 100;
    const normalized: Record<string, number> = {};
    keys.forEach((k, j) => (normalized[k] = norm[i][j]));
    return { item, score, normalized };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, idx) => ({ ...s, rank: idx + 1 }));
}
