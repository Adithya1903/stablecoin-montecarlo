import { DashboardClient } from "./DashboardClient";
import {
  fetchBtcFundingRates,
  fetchBtcMarketData,
  fetchEthFundingRates,
  fetchEthMarketData,
  fitBlendedFundingAR1,
} from "@/lib/data";
import { fetchStablecoinSummaries } from "@/lib/stablecoinData";
import { SNAPSHOTS } from "@/lib/snapshots";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { fallback?: string };
}) {
  const fallbackMode = searchParams.fallback === "1";

  const [ethRes, btcRes, summaries, ethFunding, btcFunding] =
    await Promise.all([
      fetchEthMarketData().catch((e) => {
        console.error("[page] fetchEthMarketData failed", e);
        return null;
      }),
      fetchBtcMarketData().catch((e) => {
        console.error("[page] fetchBtcMarketData failed", e);
        return null;
      }),
      fetchStablecoinSummaries().catch((e) => {
        console.error("[page] fetchStablecoinSummaries failed", e);
        return {};
      }),
      fetchEthFundingRates().catch((e) => {
        console.error("[page] fetchEthFundingRates failed", e);
        return null;
      }),
      fetchBtcFundingRates().catch((e) => {
        console.error("[page] fetchBtcFundingRates failed", e);
        return null;
      }),
    ]);

  // Blend ETH/BTC funding per USDe's hedge mix and fit an AR(1) on the
  // daily aggregate; fall back to the dated snapshot when fetches fail.
  const hedge = SNAPSHOTS.usde.hedgeMix.value;
  const fit = fitBlendedFundingAR1(
    [
      ethFunding ? { stats: ethFunding, weight: hedge.eth } : null,
      btcFunding ? { stats: btcFunding, weight: hedge.btc } : null,
    ].filter((x): x is NonNullable<typeof x> => x !== null)
  );
  const fallbackFunding = SNAPSHOTS.usde.fundingFallback.value;
  const fundingMeanDaily = fit?.meanDaily ?? fallbackFunding.meanDaily;
  const fundingVolDaily = fit?.sdDaily ?? fallbackFunding.sdDaily;
  const fundingPhi = fit?.phi ?? fallbackFunding.phi;

  const ethPrice = ethRes?.spotUsd ?? (fallbackMode ? 2400 : null);
  const btcPrice = btcRes?.spotUsd ?? (fallbackMode ? 85000 : null);
  const fetchError =
    ethPrice === null || btcPrice === null
      ? "Could not fetch price data — check connection"
      : null;

  return (
    <DashboardClient
      ethPrice={ethPrice ?? 0}
      btcPrice={btcPrice ?? 0}
      ethRealizedVol={ethRes?.volatility ?? null}
      btcRealizedVol={btcRes?.volatility ?? null}
      summaries={summaries}
      fetchError={fetchError}
      fundingMeanDaily={fundingMeanDaily}
      fundingVolDaily={fundingVolDaily}
      fundingPhi={fundingPhi}
    />
  );
}
