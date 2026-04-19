"use client";

import { useMemo } from "react";
import type { SimulationResult } from "@/lib/types";

type Props = {
  result: SimulationResult;
  currentPrice: number;
};

export function ResultsPanel({ result, currentPrice }: Props) {
  const stats = useMemo(
    () => computeStats(result, currentPrice),
    [result, currentPrice]
  );

  const pct = result.depegProbability * 100;
  const color =
    pct < 5 ? "text-emerald-400" : pct < 15 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-5 rounded-xl border border-stroke bg-surface/40 p-6">
      <div className="grid gap-5 sm:grid-cols-4">
        <Stat
          label="Depeg probability"
          value={`${pct.toFixed(2)}%`}
          valueClass={`${color} text-3xl`}
        />
        <Stat
          label="Worst 1% drawdown"
          value={`${(stats.worst1pctDrawdown * 100).toFixed(1)}%`}
          sub={`avg final $${stats.worst1pctAvgPrice.toFixed(0)}`}
        />
        <Stat
          label="Avg time-to-liq"
          value={
            stats.avgDaysToLiq !== null
              ? `day ${stats.avgDaysToLiq.toFixed(1)}`
              : "—"
          }
          sub={
            stats.avgDaysToLiq !== null
              ? `across ${result.depegCount} depeg paths`
              : "no depegs"
          }
        />
        <Stat
          label="Median final"
          value={`$${stats.medianFinal.toFixed(0)}`}
          sub={`start $${currentPrice.toFixed(0)}`}
        />
      </div>

      <Histogram
        finalPrices={stats.finalPrices}
        currentPrice={currentPrice}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-mono font-semibold text-cream ${valueClass ?? "text-xl"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

type Stats = {
  finalPrices: number[];
  medianFinal: number;
  worst1pctAvgPrice: number;
  worst1pctDrawdown: number;
  avgDaysToLiq: number | null;
};

function computeStats(result: SimulationResult, currentPrice: number): Stats {
  const n = result.paths.length;
  const finalPrices = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const path = result.paths[i];
    finalPrices[i] = path[path.length - 1];
  }
  const sorted = finalPrices.slice().sort((a, b) => a - b);
  const medianFinal = sorted[Math.floor(n / 2)] ?? currentPrice;

  const worstCount = Math.max(1, Math.floor(n * 0.01));
  let worstSum = 0;
  for (let i = 0; i < worstCount; i++) worstSum += sorted[i];
  const worst1pctAvgPrice = worstSum / worstCount;
  const worst1pctDrawdown = (currentPrice - worst1pctAvgPrice) / currentPrice;

  let daysSum = 0;
  let daysCount = 0;
  for (const d of result.depegDays) {
    if (d !== null) {
      daysSum += d;
      daysCount++;
    }
  }
  const avgDaysToLiq = daysCount > 0 ? daysSum / daysCount : null;

  return {
    finalPrices,
    medianFinal,
    worst1pctAvgPrice,
    worst1pctDrawdown,
    avgDaysToLiq,
  };
}

function Histogram({
  finalPrices,
  currentPrice,
}: {
  finalPrices: number[];
  currentPrice: number;
}) {
  const bins = 28;
  const { counts, min, max, maxCount } = useMemo(() => {
    let min = finalPrices[0];
    let max = finalPrices[0];
    for (const p of finalPrices) {
      if (p < min) min = p;
      if (p > max) max = p;
    }
    if (min === max) max = min + 1;
    const counts = new Array<number>(bins).fill(0);
    for (const p of finalPrices) {
      const idx = Math.min(
        bins - 1,
        Math.floor(((p - min) / (max - min)) * bins)
      );
      counts[idx]++;
    }
    let maxCount = 0;
    for (const c of counts) if (c > maxCount) maxCount = c;
    return { counts, min, max, maxCount };
  }, [finalPrices]);

  const startFrac = Math.max(
    0,
    Math.min(1, (currentPrice - min) / (max - min))
  );

  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted">
        Distribution of final prices
      </p>
      <div className="relative h-24 overflow-hidden rounded-md border border-stroke bg-charcoal">
        <div
          className="absolute top-0 bottom-0 w-px bg-cream/60"
          style={{ left: `${startFrac * 100}%` }}
          title={`start $${currentPrice.toFixed(0)}`}
        />
        <div className="flex h-full items-end gap-px px-1">
          {counts.map((c, i) => (
            <div
              key={i}
              className="flex-1 bg-cream/70"
              style={{ height: `${(c / maxCount) * 100}%` }}
              title={`${c} paths`}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
        <span>${min.toFixed(0)}</span>
        <span>${max.toFixed(0)}</span>
      </div>
    </div>
  );
}

