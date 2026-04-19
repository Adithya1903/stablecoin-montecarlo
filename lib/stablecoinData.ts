import { STABLECOINS, type StablecoinConfig } from "./stablecoins";

const REVALIDATE_SECONDS = 300;

export type StablecoinLiveData = {
  id: string;
  defillamaId?: string;
  pegPrice: number | null;
  circulatingUsd: number;
  marketCapUsd: number;
  /** [unix-seconds, circulatingUsd] over last ~30 days. */
  history30d: [number, number][];
};

interface LlamaStablecoinsResponse {
  peggedAssets: Array<{
    id: string;
    name: string;
    symbol: string;
    price?: number | null;
    circulating?: Record<string, number | undefined>;
  }>;
}

interface LlamaCoinHistoryEntry {
  date: string | number;
  totalCirculating?: Record<string, number | undefined>;
  totalCirculatingUSD?: Record<string, number | undefined>;
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

async function fetchHistory(
  defillamaId: string
): Promise<[number, number][]> {
  try {
    const entries = await fetchJson<LlamaCoinHistoryEntry[]>(
      `https://stablecoins.llama.fi/stablecoincharts/all?stablecoin=${defillamaId}`
    );
    const points: [number, number][] = entries.map((h) => {
      const ts = typeof h.date === "string" ? Number(h.date) : h.date;
      const usd = h.totalCirculatingUSD?.peggedUSD ?? 0;
      return [ts, usd];
    });
    return points.slice(-30);
  } catch {
    return [];
  }
}

export async function fetchStablecoinLiveData(
  config: StablecoinConfig
): Promise<StablecoinLiveData> {
  const empty: StablecoinLiveData = {
    id: config.id,
    defillamaId: config.defillamaId,
    pegPrice: null,
    circulatingUsd: 0,
    marketCapUsd: 0,
    history30d: [],
  };
  if (!config.defillamaId) return empty;

  try {
    const list = await fetchList();
    const match = list.peggedAssets.find((a) => a.id === config.defillamaId);
    if (!match) return empty;

    const circulatingUsd = match.circulating?.peggedUSD ?? 0;
    const history30d = await fetchHistory(config.defillamaId);

    return {
      id: config.id,
      defillamaId: config.defillamaId,
      pegPrice: match.price ?? null,
      circulatingUsd,
      marketCapUsd: circulatingUsd,
      history30d,
    };
  } catch (e) {
    console.error(`[stablecoinData] ${config.id} fetch failed`, e);
    return empty;
  }
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

export async function fetchAllStablecoinLiveData(): Promise<
  Record<string, StablecoinLiveData>
> {
  const list = await fetchList().catch((e) => {
    console.error("[stablecoinData] list fetch failed", e);
    return { peggedAssets: [] } as LlamaStablecoinsResponse;
  });
  const byId = new Map(list.peggedAssets.map((a) => [a.id, a]));

  const results = await Promise.all(
    STABLECOINS.map(async (config): Promise<StablecoinLiveData> => {
      if (!config.defillamaId) {
        return {
          id: config.id,
          pegPrice: null,
          circulatingUsd: 0,
          marketCapUsd: 0,
          history30d: [],
        };
      }
      const match = byId.get(config.defillamaId);
      const circulatingUsd = match?.circulating?.peggedUSD ?? 0;
      const history30d = await fetchHistory(config.defillamaId);
      return {
        id: config.id,
        defillamaId: config.defillamaId,
        pegPrice: match?.price ?? null,
        circulatingUsd,
        marketCapUsd: circulatingUsd,
        history30d,
      };
    })
  );

  return Object.fromEntries(results.map((r) => [r.id, r]));
}
