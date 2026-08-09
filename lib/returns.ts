import type { Rng } from "./rng";

/**
 * Shared return generator for the collateral simulators.
 *
 * - Log-space: a day's price factor is exp(μ + σ·z) with μ = −σ²/2, so
 *   prices stay strictly positive and compounding is unbiased.
 * - Fat tails: z is a variance-normalized Student-t draw (ν = 5 by
 *   default). All assets share one chi-square mixing variable per day —
 *   the proper multivariate-t construction — so joint tail events are
 *   more likely than under independent fat tails. ν ≥ GAUSSIAN_NU
 *   switches to plain Gaussian draws for comparison runs.
 * - Correlation: N-asset equicorrelation matrix (1s on the diagonal,
 *   ρ elsewhere), valid for ρ ∈ (−1/(N−1), 1], factored by a standard
 *   Cholesky decomposition.
 * - Volatility clustering: optional EWMA (RiskMetrics-style), where
 *   σ²_{t+1} = λ·σ²_t + (1−λ)·r²_t, so crash days raise subsequent vol.
 */

export const DEFAULT_NU = 5;
/** ν at or above this is treated as Gaussian (t converges to normal). */
export const GAUSSIAN_NU = 100;

export type ReturnEngineOptions = {
  /** Pairwise equicorrelation, clamped into (−1/(N−1), 1]. Default 0. */
  rho?: number;
  /** Student-t degrees of freedom (integer ≥ 3). Default DEFAULT_NU. */
  nu?: number;
  /** EWMA λ (e.g. 0.94). Omit for constant volatility. */
  ewmaLambda?: number;
};

/** Lower-triangular Cholesky factor of the N×N equicorrelation matrix. */
function choleskyEquicorr(n: number, rho: number): number[][] {
  const L: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0)
  );
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      const target = i === j ? 1 : rho;
      let sum = target;
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(sum, 1e-12));
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }
  return L;
}

export class ReturnEngine {
  private readonly rng: Rng;
  private readonly n: number;
  private readonly baseVols: number[];
  private readonly nu: number;
  private readonly gaussian: boolean;
  private readonly tScale: number;
  private readonly ewmaLambda: number | null;
  private readonly chol: number[][] | null; // null → uncorrelated or ρ≈1
  private readonly perfectCorr: boolean;
  readonly rho: number;
  /** Current per-asset variance (EWMA state; equals baseVol² when λ off). */
  private readonly vars: number[];

  constructor(rng: Rng, vols: number[], opts: ReturnEngineOptions = {}) {
    this.rng = rng;
    this.n = vols.length;
    this.baseVols = vols.slice();
    this.vars = vols.map((v) => v * v);

    const nu = Math.round(opts.nu ?? DEFAULT_NU);
    this.nu = Math.max(3, nu);
    this.gaussian = this.nu >= GAUSSIAN_NU;
    // t(ν) has variance ν/(ν−2); rescale draws to unit variance.
    this.tScale = Math.sqrt((this.nu - 2) / this.nu);
    this.ewmaLambda = opts.ewmaLambda ?? null;

    const minRho = this.n > 1 ? -1 / (this.n - 1) + 1e-6 : 0;
    const rho = Math.min(1, Math.max(minRho, opts.rho ?? 0));
    this.rho = rho;
    this.perfectCorr = rho >= 0.999;
    this.chol =
      this.n > 1 && !this.perfectCorr && Math.abs(rho) > 0.001
        ? choleskyEquicorr(this.n, rho)
        : null;
  }

  /** One shared chi-square(ν)/ν mixing draw (integer ν, sum of squares). */
  private mixing(): number {
    let s = 0;
    for (let k = 0; k < this.nu; k++) {
      const g = this.rng.normal(0, 1);
      s += g * g;
    }
    return s / this.nu;
  }

  /**
   * Correlated, unit-variance, fat-tailed draws — one per asset. All
   * assets share the day's t mixing variable (joint tails).
   */
  z(): number[] {
    const g = new Array<number>(this.n);
    if (this.perfectCorr) {
      const common = this.rng.normal(0, 1);
      g.fill(common);
    } else {
      for (let i = 0; i < this.n; i++) g[i] = this.rng.normal(0, 1);
      if (this.chol) {
        const c = new Array<number>(this.n);
        for (let i = 0; i < this.n; i++) {
          let acc = 0;
          for (let j = 0; j <= i; j++) acc += this.chol[i][j] * g[j];
          c[i] = acc;
        }
        for (let i = 0; i < this.n; i++) g[i] = c[i];
      }
    }
    if (!this.gaussian) {
      const scale = this.tScale / Math.sqrt(this.mixing());
      for (let i = 0; i < this.n; i++) g[i] *= scale;
    }
    return g;
  }

  private updateVar(i: number, logReturn: number): void {
    if (this.ewmaLambda === null) return;
    const l = this.ewmaLambda;
    this.vars[i] = l * this.vars[i] + (1 - l) * logReturn * logReturn;
  }

  /**
   * Advance one day. Returns per-asset multiplicative price factors
   * exp(−σ²/2 + σ·z) plus the raw z draws (for models that apply a
   * draw additively, e.g. DAI's USDC peg noise).
   */
  step(): { z: number[]; factors: number[] } {
    const zs = this.z();
    const factors = new Array<number>(this.n);
    for (let i = 0; i < this.n; i++) {
      const sigma = Math.sqrt(this.vars[i]);
      const r = -0.5 * sigma * sigma + sigma * zs[i];
      factors[i] = Math.exp(r);
      this.updateVar(i, sigma * zs[i]);
    }
    return { z: zs, factors };
  }

  /**
   * Forced crash on `assetIdx`, transmitted to the other assets through
   * the correlation: the shocked asset moves exactly (1 + crash); each
   * other asset gets the conditional co-move ρ·(σ_j/σ_0)·ln(1+crash)
   * plus idiosyncratic noise σ_j·√(1−ρ²)·z_j.
   */
  crashStep(assetIdx: number, crash: number): number[] {
    const r0 = Math.log(1 + crash);
    const sigma0 = Math.sqrt(this.vars[assetIdx]);
    const idio = Math.sqrt(Math.max(0, 1 - this.rho * this.rho));
    const factors = new Array<number>(this.n);
    for (let i = 0; i < this.n; i++) {
      if (i === assetIdx) {
        factors[i] = 1 + crash;
        this.updateVar(i, r0);
        continue;
      }
      const sigma = Math.sqrt(this.vars[i]);
      let zi = this.rng.normal(0, 1);
      if (!this.gaussian) zi *= this.tScale / Math.sqrt(this.mixing());
      const r = this.rho * (sigma / sigma0) * r0 + sigma * idio * zi;
      factors[i] = Math.exp(r);
      this.updateVar(i, r);
    }
    return factors;
  }
}
