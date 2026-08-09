"use client";

import { useMemo, useState } from "react";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ScenarioAnalysis } from "@/components/ScenarioAnalysis";
import { SimulationChart } from "@/components/SimulationChart";
import { SliderPanel } from "@/components/SliderPanel";
import { StablecoinSelector } from "@/components/StablecoinSelector";
import { isBtcBacked } from "@/lib/dispatch";
import { randomSeed } from "@/lib/rng";
import { SNAPSHOTS } from "@/lib/snapshots";
import { getStablecoin, type StablecoinConfig } from "@/lib/stablecoins";
import { useSimulation } from "@/lib/useSimulation";
import type { SimulationParams } from "@/lib/types";

const DEFAULTS: SimulationParams = {
  seed: 42,
  volatility: 0.04,
  days: 30,
  numSimulations: 10000,
  initialCrash: 0,
  collateralRatio: 1.5,
  liquidationThreshold: 1.1,
};

type Summary = { pegPrice: number | null; marketCapUsd: number };

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

export function DashboardClient({
  ethPrice,
  btcPrice,
  ethRealizedVol = null,
  btcRealizedVol = null,
  summaries = {},
  fetchError = null,
  fundingMeanDaily = SNAPSHOTS.usde.fundingFallback.value.meanDaily,
  fundingVolDaily = SNAPSHOTS.usde.fundingFallback.value.sdDaily,
  fundingPhi = SNAPSHOTS.usde.fundingFallback.value.phi,
}: {
  ethPrice: number;
  btcPrice: number;
  /** 365d realized daily vol from CoinGecko history; null if the fetch failed. */
  ethRealizedVol?: number | null;
  btcRealizedVol?: number | null;
  summaries?: Record<string, Summary>;
  fetchError?: string | null;
  fundingMeanDaily?: number;
  fundingVolDaily?: number;
  fundingPhi?: number;
}) {
  const [selectedId, setSelectedId] = useState<string>("dai");
  const selected = getStablecoin(selectedId);
  const btcBacked = isBtcBacked(selected);
  const isUsde = selectedId === "usde";
  const isFiat = selectedId === "usdc" || selectedId === "usdt";
  const isUst = selectedId === "ust";
  const underlyingPrice = btcBacked ? btcPrice : ethPrice;
  const underlyingLabel = btcBacked ? "BTC" : "ETH";
  const realizedVol = btcBacked ? btcRealizedVol : ethRealizedVol;

  const [params, setParams] = useState<SimulationParams>(() => ({
    ...DEFAULTS,
    // Seed the volatility default from live 365d realized vol when present.
    volatility: ethRealizedVol ?? DEFAULTS.volatility,
  }));

  const handleSelect = (coin: StablecoinConfig) => {
    setSelectedId(coin.id);
    const weights = lstWeights(coin);
    const isCollateralModel = !["usde", "usdc", "usdt", "ust"].includes(
      coin.id
    );
    const coinRealizedVol = isBtcBacked(coin)
      ? btcRealizedVol
      : ethRealizedVol;
    setParams((prev) => ({
      ...prev,
      // Volatility default tracks the coin's underlying 365d realized vol.
      volatility:
        isCollateralModel && coinRealizedVol !== null
          ? coinRealizedVol
          : prev.volatility,
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
      fundingPhi:
        coin.id === "usde" ? (prev.fundingPhi ?? fundingPhi) : undefined,
      fundingRateShock:
        coin.id === "usde" ? (prev.fundingRateShock ?? 0) : undefined,
      reserveFund:
        coin.id === "usde"
          ? (prev.reserveFund ?? SNAPSHOTS.usde.reserveFund.value)
          : undefined,
      fundingMeanDaily:
        coin.id === "usde"
          ? (prev.fundingMeanDaily ?? fundingMeanDaily)
          : undefined,
      ...(coin.id === "usdc"
        ? {
            eventProbability: SNAPSHOTS.usdc.eventProbability.value,
            redemptionSeverity: SNAPSHOTS.usdc.redemptionSeverity.value,
            baseLiquidity: SNAPSHOTS.usdc.baseLiquidity.value,
            reserveLiquidity: 1.0,
            totalSupply: SNAPSHOTS.usdc.totalSupply.value,
            forceDay1Event: false,
          }
        : coin.id === "usdt"
          ? {
              eventProbability: SNAPSHOTS.usdt.eventProbability.value,
              redemptionSeverity: SNAPSHOTS.usdt.redemptionSeverity.value,
              baseLiquidity: SNAPSHOTS.usdt.baseLiquidity.value,
              reserveLiquidity: 1.0,
              totalSupply: SNAPSHOTS.usdt.totalSupply.value,
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
                  ? (prev.totalSupply ?? SNAPSHOTS.usde.totalSupply.value)
                  : undefined,
            }),
      ...(coin.id === "ust"
        ? {
            initialSellPressure: prev.initialSellPressure ?? 0.05,
            reflexivityFactor: prev.reflexivityFactor ?? 3.0,
            lunaStartMarketCap:
              prev.lunaStartMarketCap ?? SNAPSHOTS.ust.lunaMarketCap.value,
            ustSupplyUsd: prev.ustSupplyUsd ?? SNAPSHOTS.ust.supplyUsd.value,
            days: 14,
          }
        : {
            initialSellPressure: undefined,
            reflexivityFactor: undefined,
            lunaStartMarketCap: undefined,
            ustSupplyUsd: undefined,
          }),
    }));
  };

  // Pre-run validation — anything here blocks the worker from spinning.
  const preError = useMemo(() => {
    if (fetchError) return fetchError;
    if (
      !isUsde &&
      !isFiat &&
      !isUst &&
      (!Number.isFinite(underlyingPrice) || underlyingPrice <= 0)
    ) {
      return `Invalid ${underlyingLabel} price: ${underlyingPrice}`;
    }
    if (
      !isUsde &&
      !isFiat &&
      !isUst &&
      selectedId !== "lusd" &&
      params.liquidationThreshold >= params.collateralRatio
    ) {
      return `Liquidation threshold (${params.liquidationThreshold}) must be below collateral ratio (${params.collateralRatio})`;
    }
    return null;
  }, [
    fetchError,
    isUsde,
    isFiat,
    isUst,
    underlyingPrice,
    underlyingLabel,
    selectedId,
    params.liquidationThreshold,
    params.collateralRatio,
  ]);

  const {
    run,
    partial,
    pending,
    error: simError,
  } = useSimulation({
    coinId: selectedId,
    ethPrice,
    btcPrice,
    params,
    enabled: preError === null,
  });
  const error = preError ?? simError;

  // Per-mechanism display baseline. Paths are reserve dollars for USDe,
  // peg prices (~$1) for fiat/UST, and collateral-basket dollars otherwise —
  // medianPath[0] is the true day-0 value on every model (including GHO,
  // whose basket start is not the ETH spot price).
  const displayStart = run ? run.result.medianPath[0] : underlyingPrice;
  const displayFormat = isUsde
    ? formatUsdCompact
    : isFiat
      ? (n: number) => `$${n.toFixed(3)}`
      : isUst
        ? (n: number) => `$${n.toFixed(2)}`
        : (n: number) => `$${n.toFixed(0)}`;

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
      {isUst && (
        <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-semibold text-red-300">
            ⚠️ COLLAPSED — May 2022. ~$40 billion destroyed in 3 days.
          </p>
          <p className="mt-1 text-red-200/80">
            This is an educational simulation showing why purely algorithmic
            stablecoins fail. This mechanism has a 100% historical failure
            rate.
          </p>
        </div>
      )}
      <header className="mb-8 border-b border-stroke pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Monte Carlo
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
          Stablecoin stress dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          {params.numSimulations.toLocaleString()} simulated price paths for{" "}
          <span className="text-cream">{selected?.name ?? "DAI"}</span>{" "}
          collateral. Pick a stablecoin, then drag the sliders to change
          volatility, shock scenarios, or the buffer between CR and liquidation
          threshold. Red paths breached liquidation; blue paths survived.
        </p>
        <div className="mt-4 flex flex-wrap gap-6 font-mono text-xs text-muted">
          {isUst ? (
            <>
              <div>
                UST supply:{" "}
                <span className="text-cream">
                  {formatUsdCompact(
                    params.ustSupplyUsd ?? SNAPSHOTS.ust.supplyUsd.value
                  )}
                </span>
              </div>
              <div>
                LUNA cap:{" "}
                <span className="text-cream">
                  {formatUsdCompact(
                    params.lunaStartMarketCap ??
                      SNAPSHOTS.ust.lunaMarketCap.value
                  )}
                </span>
              </div>
              <div>
                Reflexivity:{" "}
                <span className="text-cream">
                  {(params.reflexivityFactor ?? 3).toFixed(1)}×
                </span>
              </div>
            </>
          ) : isFiat ? (
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
                  {formatUsdCompact(
                    params.reserveFund ?? SNAPSHOTS.usde.reserveFund.value
                  )}
                </span>{" "}
                <span className="text-muted/70">
                  (as of {SNAPSHOTS.usde.reserveFund.asOf})
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
                  {formatUsdCompact(
                    params.totalSupply ?? SNAPSHOTS.usde.totalSupply.value
                  )}
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
          ) : run || partial ? (
            <>
              <SimulationChart
                result={run?.result ?? null}
                partial={partial}
                currentPrice={displayStart}
                liquidationThreshold={
                  (run?.params ?? params).liquidationThreshold
                }
                collateralRatio={(run?.params ?? params).collateralRatio}
                elapsedMs={run?.elapsedMs ?? null}
                onReroll={() =>
                  setParams((prev) => ({ ...prev, seed: randomSeed() }))
                }
                thresholdOverride={
                  isUsde ? 0 : isFiat ? 0.97 : isUst ? 0.5 : undefined
                }
                thresholdLabel={
                  isUsde
                    ? "reserve depleted"
                    : isFiat
                      ? "depeg $0.97"
                      : isUst
                        ? "full collapse $0.50"
                        : undefined
                }
                formatValue={
                  isUsde
                    ? formatUsdCompact
                    : isFiat
                      ? (n) => `$${n.toFixed(3)}`
                      : isUst
                        ? (n) => `$${n.toFixed(2)}`
                        : undefined
                }
              />
              {run && isUst && run.result.luna && (
                <SimulationChart
                  result={{
                    paths: run.result.luna.paths,
                    depegCount: 0,
                    depegProbability: 0,
                    depegProbabilityCI: [0, 0],
                    seed: run.result.seed,
                    depegDays: run.result.depegDays,
                    worstPath: run.result.luna.worstPath,
                    medianPath: run.result.luna.medianPath,
                    percentile5Path: run.result.luna.percentile5Path,
                    percentile95Path: run.result.luna.percentile95Path,
                  }}
                  currentPrice={1.0}
                  liquidationThreshold={run.params.liquidationThreshold}
                  collateralRatio={run.params.collateralRatio}
                  elapsedMs={run.elapsedMs}
                  thresholdOverride={0.01}
                  thresholdLabel="LUNA → 0"
                  formatValue={(n) => `${(n * 100).toFixed(1)}%`}
                />
              )}
              {run && (
                <>
                  <ResultsPanel
                    result={run.result}
                    currentPrice={displayStart}
                    formatValue={displayFormat}
                  />
                  <ScenarioAnalysis
                    params={run.params}
                    result={run.result}
                    ethPrice={underlyingPrice}
                    startValue={displayStart}
                  />
                </>
              )}
              {pending && (
                <p className="font-mono text-xs text-muted">
                  Running {params.numSimulations.toLocaleString()}{" "}
                  simulations…
                </p>
              )}
            </>
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-xl border border-stroke bg-surface/30 font-mono text-sm text-muted">
              Running {params.numSimulations.toLocaleString()} simulations…
            </div>
          )}
        </div>

        <aside>
          <SliderPanel
            params={params}
            onChange={setParams}
            selectedId={selectedId}
            realizedVol={realizedVol}
          />
        </aside>
      </div>

      <DataSourcesNote />
    </div>
  );
}

function DataSourcesNote() {
  return (
    <footer className="mt-10 rounded-xl border border-stroke bg-surface/20 p-4 text-[11px] leading-relaxed text-muted">
      <p className="mb-1 font-mono uppercase tracking-[0.18em]">
        Data sources
      </p>
      <p>
        Live: ETH/BTC spot & 365d history (CoinGecko), ETHUSDT/BTCUSDT
        funding (Binance), stablecoin supplies (DeFiLlama). Protocol
        constants are dated snapshots —{" "}
        {[
          ["Ethena reserve", SNAPSHOTS.usde.reserveFund.asOf],
          ["DAI PSM split", SNAPSHOTS.dai.psmWeights.asOf],
          ["GHO basket", SNAPSHOTS.gho.collateral.asOf],
          ["USDC reserves", SNAPSHOTS.usdc.reserveComposition.asOf],
          ["USDT reserves", SNAPSHOTS.usdt.reserveComposition.asOf],
          ["UST/LUNA", SNAPSHOTS.ust.supplyUsd.asOf],
        ]
          .map(([label, asOf]) => `${label} (${asOf})`)
          .join(", ")}{" "}
        — see <span className="font-mono">lib/snapshots.ts</span> for every
        figure&apos;s source. Educational tool, not risk advice.
      </p>
    </footer>
  );
}
