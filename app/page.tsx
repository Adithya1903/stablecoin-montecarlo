import { DashboardClient } from "./DashboardClient";
import { fetchEthMarketData } from "@/lib/data";
import { fetchStablecoinSummaries } from "@/lib/stablecoinData";

export const dynamic = "force-dynamic";

export default async function Home() {
  let spotUsd = 3000;
  try {
    const eth = await fetchEthMarketData();
    if (Number.isFinite(eth.spotUsd) && eth.spotUsd > 0) spotUsd = eth.spotUsd;
  } catch (e) {
    console.error("[page] fetchEthMarketData failed, using fallback", e);
  }
  const summaries = await fetchStablecoinSummaries().catch((e) => {
    console.error("[page] fetchStablecoinSummaries failed", e);
    return {};
  });
  return <DashboardClient ethPrice={spotUsd} summaries={summaries} />;
}
