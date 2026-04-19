import { DashboardClient } from "./DashboardClient";
import { fetchEthMarketData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const eth = await fetchEthMarketData();
  return <DashboardClient ethPrice={eth.spotUsd} />;
}
