// Analytic Hierarchy Process: derive criteria weights from pairwise comparisons
// and report the Consistency Ratio (CR) so the user can trust the weights.

// Random Index (Saaty) for n = 1..10
const RI = [0, 0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

export interface AhpResult {
  weights: number[]; // normalized, sum = 1
  lambdaMax: number;
  ci: number;
  cr: number; // < 0.1 = acceptably consistent
  consistent: boolean;
}

// matrix[i][j] = how much more important criterion i is than j (Saaty 1..9),
// with matrix[j][i] = 1 / matrix[i][j] and matrix[i][i] = 1.
export function ahp(matrix: number[][]): AhpResult {
  const n = matrix.length;
  // Priority vector via the geometric-mean (logarithmic least squares) method.
  const geo = matrix.map((row) => Math.pow(row.reduce((a, b) => a * b, 1), 1 / n));
  const sum = geo.reduce((a, b) => a + b, 0) || 1;
  const weights = geo.map((g) => g / sum);

  // lambda_max = average over i of (A w)_i / w_i
  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let aw = 0;
    for (let j = 0; j < n; j++) aw += matrix[i][j] * weights[j];
    lambdaMax += aw / (weights[i] || 1e-9);
  }
  lambdaMax /= n;

  const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  const ri = RI[n] ?? 1.49;
  const cr = ri > 0 ? ci / ri : 0;
  return { weights, lambdaMax, ci, cr, consistent: cr <= 0.1 + 1e-9 };
}

// Build a reciprocal matrix from a map of pairwise Saaty judgements.
// pairs["i-j"] = value v means criterion i is v× as important as j (v may be <1).
export function matrixFromPairs(n: number, pairs: Record<string, number>): number[][] {
  const m = Array.from({ length: n }, () => Array(n).fill(1));
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const v = pairs[`${i}-${j}`] ?? 1;
      m[i][j] = v;
      m[j][i] = 1 / v;
    }
  return m;
}

// Derive an equivalent pairwise matrix from simple 1..9 importance ratings.
// Lets users express priorities quickly while still running the real AHP math.
export function matrixFromRatings(ratings: number[]): number[][] {
  const n = ratings.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => ratings[i] / ratings[j])
  );
}
