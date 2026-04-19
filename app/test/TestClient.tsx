"use client";

import { useEffect, useState } from "react";
import { simulateDAI } from "@/lib/montecarlo";
import type { SimulationParams, SimulationResult } from "@/lib/types";

const DEFAULT_PARAMS: SimulationParams = {
  volatility: 0.04,
  days: 30,
  numSimulations: 10000,
  initialCrash: 0,
  collateralRatio: 1.5,
  liquidationThreshold: 1.45,
};

export function TestClient({ ethPrice }: { ethPrice: number }) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    const t0 = performance.now();
    const r = simulateDAI(ethPrice, DEFAULT_PARAMS);
    const t1 = performance.now();
    setResult(r);
    setElapsedMs(t1 - t0);
  }, [ethPrice]);

  return (
    <pre
      style={{
        padding: 16,
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        fontSize: 12,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {`ETH spot:           $${ethPrice.toFixed(2)}
Params:             ${JSON.stringify(DEFAULT_PARAMS)}

${result === null ? "Running simulation…" : renderResult(result, elapsedMs)}`}
    </pre>
  );
}

function renderResult(r: SimulationResult, elapsedMs: number | null): string {
  const pct = (r.depegProbability * 100).toFixed(3);
  const lines = [
    `Depeg probability:  ${r.depegProbability.toFixed(4)}  (${pct}%)`,
    `Depeg count:        ${r.depegCount} / ${r.paths.length}`,
    `Execution time:     ${elapsedMs !== null ? elapsedMs.toFixed(1) + " ms" : "—"}`,
    `Worst final price:  $${r.worstPath[r.worstPath.length - 1].toFixed(2)}`,
    "",
    "Sample paths (first 5):",
    ...r.paths
      .slice(0, 5)
      .map(
        (p, i) =>
          `  [${i}] ${JSON.stringify(p.map((x) => Number(x.toFixed(2))))}`
      ),
  ];
  return lines.join("\n");
}
