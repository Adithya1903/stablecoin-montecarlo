import { fetchEthMarketData } from "@/lib/data";
import { TestClient } from "./TestClient";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  const eth = await fetchEthMarketData();
  return <TestClient ethPrice={eth.spotUsd} />;
}
