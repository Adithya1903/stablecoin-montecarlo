import { DashboardClient } from "./DashboardClient";
import { fetchBtcMarketData, fetchEthMarketData } from "@/lib/data";
import { fetchStablecoinSummaries } from "@/lib/stablecoinData";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { fallback?: string };
}) {
  const fallbackMode = searchParams.fallback === "1";

  const [ethRes, btcRes, summaries] = await Promise.all([
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
  ]);

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
    />
  );
}
