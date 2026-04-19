"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ScenarioAnalysis } from "@/components/ScenarioAnalysis";
import { SimulationChart } from "@/components/SimulationChart";
import { SliderPanel } from "@/components/SliderPanel";
import { StablecoinSelector } from "@/components/StablecoinSelector";
import { simulateDAI } from "@/lib/montecarlo";
import { getStablecoin, type StablecoinConfig } from "@/lib/stablecoins";
import type { SimulationParams, SimulationResult } from "@/lib/types";

const DEFAULTS: SimulationParams = {
  volatility: 0.04,
  days: 30,
  numSimulations: 10000,
  initialCrash: 0,
  collateralRatio: 1.5,
  liquidationThreshold: 1.10,
};

type RunState = {
  result: SimulationResult;
  elapsedMs: number;
  params: SimulationParams;
};

type Summary = { pegPrice: number | null; marketCapUsd: number };

export function DashboardClient({
  ethPrice,
  summaries = {},
}: {
  ethPrice: number;
  summaries?: Record<string, Summary>;
}) {
  const [selectedId, setSelectedId] = useState<string>("dai");
  const selected = getStablecoin(selectedId);
  const [params, setParams] = useState<SimulationParams>(DEFAULTS);

  const handleSelect = (coin: StablecoinConfig) => {
    setSelectedId(coin.id);
    setParams((prev) => ({
      ...prev,
      collateralRatio: coin.defaultCR ?? prev.collateralRatio,
      liquidationThreshold: coin.defaultLiqThreshold ?? prev.liquidationThreshold,
    }));
  };
  const [run, setRun] = useState<RunState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!Number.isFinite(ethPrice) || ethPrice <= 0) {
      setError(`Invalid ETH price: ${ethPrice}`);
      setPending(false);
      return;
    }
    setPending(true);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        console.log("[sim] start", { ethPrice, params });
        const t0 = performance.now();
        const result = simulateDAI(ethPrice, params);
        const t1 = performance.now();
        console.log("[sim] done", { elapsedMs: t1 - t0, depegProbability: result.depegProbability });
        setRun({ result, elapsedMs: t1 - t0, params });
      } catch (e) {
        console.error("[sim] error", e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setPending(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ethPrice, params]);

  const liqPrice = useMemo(
    () => ethPrice * (params.liquidationThreshold / params.collateralRatio),
    [ethPrice, params.liquidationThreshold, params.collateralRatio]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-stroke pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Monte Carlo
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
          Stablecoin stress dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          10,000 simulated price paths for{" "}
          <span className="text-cream">{selected?.name ?? "DAI"}</span>{" "}
          collateral. Pick a stablecoin, then drag the sliders to change
          volatility, shock scenarios, or the buffer between CR and liquidation
          threshold. Red paths breached liquidation; blue paths survived.
        </p>
        <div className="mt-4 flex flex-wrap gap-6 font-mono text-xs text-muted">
          <div>
            ETH spot:{" "}
            <span className="text-cream">${ethPrice.toFixed(2)}</span>
          </div>
          <div>
            Liquidation price:{" "}
            <span className="text-red-400">${liqPrice.toFixed(0)}</span>
          </div>
          <div>
            Buffer:{" "}
            <span className="text-cream">
              {(
                ((params.collateralRatio - params.liquidationThreshold) /
                  params.collateralRatio) *
                100
              ).toFixed(1)}
              %
            </span>
          </div>
        </div>
      </header>

      <div className="mb-8">
        <StablecoinSelector
          selectedId={selectedId}
          onSelect={handleSelect}
          summaries={summaries}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {run ? (
            <>
              <SimulationChart
                result={run.result}
                currentPrice={ethPrice}
                liquidationThreshold={run.params.liquidationThreshold}
                collateralRatio={run.params.collateralRatio}
                elapsedMs={run.elapsedMs}
              />
              <ResultsPanel
                result={run.result}
                currentPrice={ethPrice}
              />
              <ScenarioAnalysis
                params={run.params}
                result={run.result}
                ethPrice={ethPrice}
              />
              {pending && (
                <p className="font-mono text-xs text-muted">
                  Running 10,000 simulations…
                </p>
              )}
            </>
          ) : error ? (
            <div className="flex h-[400px] items-center justify-center rounded-xl border border-red-500/40 bg-red-500/5 px-6 text-center font-mono text-sm text-red-400">
              Simulation failed: {error}
            </div>
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-xl border border-stroke bg-surface/30 font-mono text-sm text-muted">
              Running 10,000 simulations…
            </div>
          )}
        </div>

        <aside>
          <SliderPanel params={params} onChange={setParams} />
        </aside>
      </div>
    </div>
  );
}
