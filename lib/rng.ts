/**
 * Seeded PRNG (mulberry32) with Gaussian draws. Every simulator owns one
 * Rng instance per run, so the same seed + params reproduces bit-identical
 * results — no module-level state leaks between runs.
 */
export class Rng {
  readonly seed: number;
  private state: number;
  /** Box-Muller produces pairs; the unused half is cached per-instance. */
  private spareNormal: number | null = null;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  /** Uniform in [0, 1) — mulberry32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Gaussian via Box-Muller. */
  normal(mean = 0, stdDev = 1): number {
    if (this.spareNormal !== null) {
      const z = this.spareNormal;
      this.spareNormal = null;
      return mean + stdDev * z;
    }
    let u = 0;
    do {
      u = this.next();
    } while (u === 0);
    const v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    const theta = 2 * Math.PI * v;
    this.spareNormal = mag * Math.sin(theta);
    return mean + stdDev * mag * Math.cos(theta);
  }
}

/** Fresh unpredictable 32-bit seed for runs where the caller supplied none. */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/**
 * Wilson 95% score interval for a binomial proportion — well-behaved at
 * p̂ = 0 and 1, unlike the normal approximation.
 */
export function wilsonCI(successes: number, n: number): [number, number] {
  if (n <= 0) return [0, 0];
  const z = 1.959963984540054; // Φ⁻¹(0.975)
  const p = successes / n;
  const z2n = (z * z) / n;
  const denom = 1 + z2n;
  const center = (p + z2n / 2) / denom;
  const half =
    (z / denom) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, center - half), Math.min(1, center + half)];
}
