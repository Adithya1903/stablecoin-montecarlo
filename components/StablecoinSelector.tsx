"use client";

import type { MarketSnapshot, StablecoinId } from "@/lib/types";

const ORDER: StablecoinId[] = ["DAI", "USDe", "crvUSD"];

type Props = {
  selected: StablecoinId;
  onSelect: (id: StablecoinId) => void;
  snapshots: Partial<Record<StablecoinId, MarketSnapshot>>;
  loadingId?: StablecoinId | null;
};

export function StablecoinSelector({
  selected,
  onSelect,
  snapshots,
  loadingId,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {ORDER.map((id) => {
        const snap = snapshots[id];
        const active = selected === id;
        const loading = loadingId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
              active
                ? "border-cream bg-surface shadow-[0_0_0_1px_#F5F3EE33]"
                : "border-stroke bg-charcoal hover:border-muted"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium tracking-tight">{id}</span>
              {loading && (
                <span className="font-mono text-xs text-muted">…</span>
              )}
            </div>
            {snap && (
              <p className="mt-2 font-mono text-lg text-cream">
                ${snap.priceUsd.toFixed(4)}
              </p>
            )}
            {!snap && !loading && (
              <p className="mt-2 font-mono text-sm text-muted">—</p>
            )}
            {snap?.marketCapUsd != null && (
              <p className="mt-1 text-xs text-muted">
                MCap ≈ ${(snap.marketCapUsd / 1e9).toFixed(2)}B
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
