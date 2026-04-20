"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ScenarioAnalysis } from "@/components/ScenarioAnalysis";
import { SimulationChart } from "@/components/SimulationChart";
import { SliderPanel } from "@/components/SliderPanel";
import { StablecoinSelector } from "@/components/StablecoinSelector";
import {
  simulateDAI,
  simulateFiatBacked,
  simulateGHO,
  simulateLUSD,
  simulateOvercollateralizedBTC,
  simulateUSDe,
} from "@/lib/montecarlo";
import { getStablecoin, type StablecoinConfig } from "@/lib/stablecoins";
import type { SimulationParams, SimulationResult } from "@/lib/types";

const DEFAULTS: SimulationParams = {
  volatility: 0.04,
  days: 30,
  numSimulations: 10000,
  initialCrash: 0,
  collateralRatio: 1.5,
  liquidationThreshold: 1.1,
};

type RunState = {
  result: SimulationResult;
  elapsedMs: number;
  params: SimulationParams;
};

type Summary = { pegPrice: number | null; marketCapUsd: number };

function isBtcBacked(coin: StablecoinConfig | undefined): boolean {
  if (!coin?.collateralAssets) return false;
  return coin.collateralAssets.some(
    (a) => /^(BTC|stBTC|wBTC)/i.test(a.asset) && a.weight > 0.3
  );
}

function lstWeights(
  coin: StablecoinConfig | undefined
): { btc: number; stBtc: number } | undefined {
  if (!coin?.collateralAssets) return undefined;
  const btc = coin.collateralAssets.find((a) => /^BTC$/i.test(a.asset));
  const stBtc = coin.collateralAssets.find((a) => /^stBTC/i.test(a.asset));
  if (!btc || !stBtc) return undefined;
  return { btc: btc.weight, stBtc: stBtc.weight };
}

function formatUsdCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function validateResult(r: SimulationResult): string | null {
  if (!(r.depegProbability >= 0 && r.depegProbability <= 1)) {
    return `depegProbability out of range: ${r.depegProbability}`;
  }
  for (let i = 0; i < r.paths.length; i++) {
    const path = r.paths[i];
    for (let d = 0; d < path.length; d++) {
      const v = path[d];
      if (!Number.isFinite(v) || v < 0) {
        return `invalid path value at [${i}][${d}] = ${v}`;
      }
    }
  }
  return null;
}

export function DashboardClient({
  ethPrice,
  btcPrice,
  summaries = {},
  fetchError = null,
  fundingMeanDaily = 0.0001,
  fundingVolDaily = 0.02,
}: {
  ethPrice: number;
  btcPrice: number;
  summaries?: Record<string, Summary>;
  fetchError?: string | null;
  fundingMeanDaily?: number;
  fundingVolDaily?: number;
}) {
  const [selectedId, setSelectedId] = useState<string>("dai");
  const selected = getStablecoin(selectedId);
  const btcBacked = isBtcBacked(selected);
  const isUsde = selectedId === "usde";
  const isFiat = selectedId === "usdc" || selectedId === "usdt";
  const underlyingPrice = btcBacked ? btcPrice : ethPrice;
  const underlyingLabel = btcBacked ? "BTC" : "ETH";

  const [params, setParams] = useState<SimulationParams>(DEFAULTS);

  const handleSelect = (coin: StablecoinConfig) => {
    setSelectedId(coin.id);
    const weights = lstWeights(coin);
    setParams((prev) => ({
      ...prev,
      collateralRatio: coin.defaultCR ?? prev.collateralRatio,
      liquidationThreshold:
        coin.defaultLiqThreshold ?? prev.liquidationThreshold,
      lstBasisRisk: coin.id === "usbd" ? (prev.lstBasisRisk ?? false) : false,
      lstWeights: weights,
      usdcShock: coin.id === "dai" ? (prev.usdcShock ?? 0) : 0,
      userCR: coin.id === "lusd" ? (prev.userCR ?? 1.5) : undefined,
      systemCR: coin.id === "lusd" ? (prev.systemCR ?? 2.5) : undefined,
      correlation: coin.id === "gho" ? (prev.correlation ?? 0.7) : undefined,
      fundingRateVol:
        coin.id === "usde" ? (prev.fundingRateVol ?? fundingVolDaily) : undefined,
      fundingRateShock:
        coin.id === "usde" ? (prev.fundingRateShock ?? 0) : undefined,
      reserveFund:
        coin.id === "usde" ? (prev.reserveFund ?? 50_000_000) : undefined,
      fundingMeanDaily:
        coin.id === "usde"
          ? (prev.fundingMeanDaily ?? fundingMeanDaily)
          : undefined,
      ...(coin.id === "usdc"
        ? {
            eventProbability: 0.0001,
            redemptionSeverity: 0.1,
            baseLiquidity: 0.86,
            reserveLiquidity: 1.0,
            totalSupply: 35_000_000_000,
            forceDay1Event: false,
          }
        : coin.id === "usdt"
          ? {
              eventProbability: 0.0005,
              redemptionSeverity: 0.15,
              baseLiquidity: 0.71,
              reserveLiquidity: 1.0,
              totalSupply: 120_000_000_000,
              forceDay1Event: false,
            }
          : {
              eventProbability: undefined,
              redemptionSeverity: undefined,
              baseLiquidity: undefined,
              reserveLiquidity: undefined,
              forceDay1Event: undefined,
              totalSupply:
                coin.id === "usde"
                  ? (prev.totalSupply ?? 3_000_000_000)
                  : undefined,
            }),
    }));
  };

  const [run, setRun] = useState<RunState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(fetchError);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (fetchError) {
      setError(fetchError);
      setPending(false);
      return;
    }
    if (
      !isUsde &&
      !isFiat &&
      (!Number.isFinite(underlyingPrice) || underlyingPrice <= 0)
    ) {
      setError(`Invalid ${underlyingLabel} price: ${underlyingPrice}`);
      setPending(false);
      return;
    }
    if (
      !isUsde &&
      !isFiat &&
      selectedId !== "lusd" &&
      params.liquidationThreshold >= params.collateralRatio
    ) {
      setError(
        `Liquidation threshold (${params.liquidationThreshold}) must be below collateral ratio (${params.collateralRatio})`
      );
      setPending(false);
      return;
    }
    setPending(true);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        console.log("[sim] start", { coin: selectedId, underlyingPrice, params });
        const t0 = performance.now();
        const result = isUsde
          ? simulateUSDe(params)
          : isFiat
            ? simulateFiatBacked(params)
            : btcBacked
              ? simulateOvercollateralizedBTC(underlyingPrice, params)
              : selectedId === "lusd"
                ? simulateLUSD(underlyingPrice, params)
                : selectedId === "gho"
                  ? simulateGHO(ethPrice, btcPrice, params)
                  : simulateDAI(underlyingPrice, params);
        const t1 = performance.now();
        const bad = validateResult(result);
        if (bad) {
          console.error("[sim] sanity check failed:", bad);
          setError(`Sanity check failed: ${bad}`);
          return;
        }
        console.log("[sim] done", {
          elapsedMs: t1 - t0,
          depegProbability: result.depegProbability,
        });
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
  }, [
    underlyingPrice,
    underlyingLabel,
    btcBacked,
    isUsde,
    isFiat,
    ethPrice,
    btcPrice,
    selectedId,
    params,
    fetchError,
  ]);

  const isLusd = selectedId === "lusd";
  const liqPrice = useMemo(() => {
    if (isLusd) {
      const userCR = params.userCR ?? 1.5;
      return underlyingPrice * (1.1 / userCR);
    }
    return (
      underlyingPrice *
      (params.liquidationThreshold / params.collateralRatio)
    );
  }, [
    isLusd,
    underlyingPrice,
    params.liquidationThreshold,
    params.collateralRatio,
    params.userCR,
  ]);
  const buffer = isLusd
    ? (((params.userCR ?? 1.5) - 1.1) / (params.userCR ?? 1.5)) * 100
    : ((params.collateralRatio - params.liquidationThreshold) /
        params.collateralRatio) *
      100;

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
          {isFiat ? (
            <>
              <div>
                Supply:{" "}
                <span className="text-cream">
                  {formatUsdCompact(params.totalSupply ?? 0)}
                </span>
              </div>
              <div>
                Reserve liquidity:{" "}
                <span className="text-cream">
                  {(
                    (params.baseLiquidity ?? 0.86) *
                    (params.reserveLiquidity ?? 1) *
                    100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div>
                Event prob:{" "}
                <span className="text-cream">
                  {((params.eventProbability ?? 0) * 100).toFixed(3)}%/day
                </span>
              </div>
            </>
          ) : isUsde ? (
            <>
              <div>
                Reserve:{" "}
                <span className="text-cream">
                  {formatUsdCompact(params.reserveFund ?? 50_000_000)}
                </span>
              </div>
              <div>
                Daily funding rate:{" "}
                <span className="text-cream">
                  {(
                    (params.fundingMeanDaily ?? fundingMeanDaily) * 100
                  ).toFixed(3)}
                  %
                </span>
              </div>
              <div>
                Supply:{" "}
                <span className="text-cream">
                  {formatUsdCompact(params.totalSupply ?? 3_000_000_000)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                {underlyingLabel} spot:{" "}
                <span className="text-cream">
                  ${underlyingPrice.toFixed(2)}
                </span>
              </div>
              <div>
                Liquidation price:{" "}
                <span className="text-red-400">${liqPrice.toFixed(0)}</span>
              </div>
              <div>
                Buffer:{" "}
                <span className="text-cream">{buffer.toFixed(1)}%</span>
              </div>
            </>
          )}
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
          {error ? (
            <div className="flex h-[400px] items-center justify-center rounded-xl border border-red-500/40 bg-red-500/5 px-6 text-center font-mono text-sm text-red-400">
              {error}
            </div>
          ) : run ? (
            <>
              <SimulationChart
                result={run.result}
                currentPrice={
                  isUsde
                    ? (run.params.reserveFund ?? 50_000_000)
                    : isFiat
                      ? 1.0
                      : underlyingPrice
                }
                liquidationThreshold={run.params.liquidationThreshold}
                collateralRatio={run.params.collateralRatio}
                elapsedMs={run.elapsedMs}
                thresholdOverride={
                  isUsde ? 0 : isFiat ? 0.97 : undefined
                }
                thresholdLabel={
                  isUsde
                    ? "reserve depleted"
                    : isFiat
                      ? "depeg $0.97"
                      : undefined
                }
                formatValue={
                  isUsde
                    ? formatUsdCompact
                    : isFiat
                      ? (n) => `$${n.toFixed(3)}`
                      : undefined
                }
              />
              <ResultsPanel
                result={run.result}
                currentPrice={underlyingPrice}
              />
              <ScenarioAnalysis
                params={run.params}
                result={run.result}
                ethPrice={underlyingPrice}
              />
              {pending && (
                <p className="font-mono text-xs text-muted">
                  Running 10,000 simulations…
                </p>
              )}
            </>
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-xl border border-stroke bg-surface/30 font-mono text-sm text-muted">
              Running 10,000 simulations…
            </div>
          )}
        </div>

        <aside>
          <SliderPanel
            params={params}
            onChange={setParams}
            selectedId={selectedId}
          />
        </aside>
      </div>
    </div>
  );
}
