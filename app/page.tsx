import { DashboardClient } from "./DashboardClient";
import {
  fetchBtcMarketData,
  fetchEthFundingRates,
  fetchEthMarketData,
} from "@/lib/data";
import { fetchStablecoinSummaries } from "@/lib/stablecoinData";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { fallback?: string };
}) {
  const fallbackMode = searchParams.fallback === "1";

  const [ethRes, btcRes, summaries, funding] = await Promise.all([
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
  ]);

  // Binance funding rate is per 8-hour window (3/day). Convert to daily.
  const fundingMeanDaily = funding ? funding.mean * 3 : 0.0001;
  const fundingVolDaily = funding ? funding.stdDev * Math.sqrt(3) : 0.02;

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
      summaries={summaries}
      fetchError={fetchError}
      fundingMeanDaily={fundingMeanDaily}
      fundingVolDaily={fundingVolDaily}
    />
  );
}
