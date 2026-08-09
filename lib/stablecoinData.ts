import { STABLECOINS } from "./stablecoins";

const REVALIDATE_SECONDS = 300;

interface LlamaStablecoinsResponse {
  peggedAssets: Array<{
    id: string;
    name: string;
    symbol: string;
    price?: number | null;
    circulating?: Record<string, number | undefined>;
  }>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}

async function fetchList(): Promise<LlamaStablecoinsResponse> {
  return fetchJson<LlamaStablecoinsResponse>(
    "https://stablecoins.llama.fi/stablecoins?includePrices=true"
  );
}

/**
 * Lightweight batch fetch — one list call, no per-coin history.
 * Use this for selector tiles where only peg price and market cap matter.
 */
export async function fetchStablecoinSummaries(): Promise<
  Record<string, { pegPrice: number | null; marketCapUsd: number }>
> {
  const list = await fetchList().catch((e) => {
    console.error("[stablecoinData] summary list fetch failed", e);
    return { peggedAssets: [] } as LlamaStablecoinsResponse;
  });
  const byId = new Map(list.peggedAssets.map((a) => [a.id, a]));
  const out: Record<string, { pegPrice: number | null; marketCapUsd: number }> = {};
  for (const config of STABLECOINS) {
    if (!config.defillamaId) {
      out[config.id] = { pegPrice: null, marketCapUsd: 0 };
      continue;
    }
    const match = byId.get(config.defillamaId);
    out[config.id] = {
      pegPrice: match?.price ?? null,
      marketCapUsd: match?.circulating?.peggedUSD ?? 0,
    };
  }
  return out;
}
