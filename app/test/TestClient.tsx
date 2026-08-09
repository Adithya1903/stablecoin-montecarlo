"use client";

import { useEffect, useState } from "react";
import { simulateDAI } from "@/lib/montecarlo";
import type { SimulationParams, SimulationResult } from "@/lib/types";

const DEFAULT_PARAMS: SimulationParams = {
  seed: 42,
  volatility: 0.04,
  days: 30,
  numSimulations: 10000,
  initialCrash: 0,
  collateralRatio: 1.5,
  liquidationThreshold: 1.45,
};

/** Same seed + same params must reproduce bit-identical paths. */
function checkDeterminism(ethPrice: number): string {
  const a = simulateDAI(ethPrice, DEFAULT_PARAMS);
  const b = simulateDAI(ethPrice, DEFAULT_PARAMS);
  if (a.depegCount !== b.depegCount) {
    return `FAIL — depegCount ${a.depegCount} vs ${b.depegCount}`;
  }
  for (let i = 0; i < a.paths.length; i++) {
    const pa = a.paths[i];
    const pb = b.paths[i];
    for (let d = 0; d < pa.length; d++) {
      if (pa[d] !== pb[d]) {
        return `FAIL — paths diverge at [${i}][${d}]: ${pa[d]} vs ${pb[d]}`;
      }
    }
  }
  const c = simulateDAI(ethPrice, { ...DEFAULT_PARAMS, seed: 43 });
  const identicalToC = a.paths.every((p, i) =>
    p.every((v, d) => v === c.paths[i][d])
  );
  if (identicalToC) return "FAIL — different seeds produced identical paths";
  return "PASS — same seed reproduces identical paths; different seed differs";
}

export function TestClient({ ethPrice }: { ethPrice: number }) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [determinism, setDeterminism] = useState<string>("running…");

  useEffect(() => {
    const t0 = performance.now();
    const r = simulateDAI(ethPrice, DEFAULT_PARAMS);
    const t1 = performance.now();
    setResult(r);
    setElapsedMs(t1 - t0);
    setDeterminism(checkDeterminism(ethPrice));
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

Determinism check:  ${determinism}

${result === null ? "Running simulation…" : renderResult(result, elapsedMs)}`}
    </pre>
  );
}

function renderResult(r: SimulationResult, elapsedMs: number | null): string {
  const pct = (r.depegProbability * 100).toFixed(3);
  const lines = [
    `Depeg probability:  ${r.depegProbability.toFixed(4)}  (${pct}%)`,
    `95% CI:             [${r.depegProbabilityCI[0].toFixed(4)}, ${r.depegProbabilityCI[1].toFixed(4)}]`,
    `Seed:               ${r.seed}`,
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
