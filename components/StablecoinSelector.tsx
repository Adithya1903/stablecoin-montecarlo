"use client";

import { useState } from "react";
import { STABLECOINS, type StablecoinConfig, type StablecoinMechanism } from "@/lib/stablecoins";

type Props = {
  selectedId: string;
  onSelect: (coin: StablecoinConfig) => void;
};

const MECHANISM_LABEL: Record<StablecoinMechanism, string> = {
  overcollateralized: "Overcollateralized",
  "delta-neutral": "Delta-neutral",
  "fiat-backed": "Fiat-backed",
  algorithmic: "Algorithmic",
};

const MECHANISM_ORDER: StablecoinMechanism[] = [
  "overcollateralized",
  "delta-neutral",
  "fiat-backed",
  "algorithmic",
];

export function StablecoinSelector({ selectedId, onSelect }: Props) {
  return (
    <div className="space-y-4">
      {MECHANISM_ORDER.map((mech) => {
        const coins = STABLECOINS.filter((c) => c.mechanism === mech);
        if (coins.length === 0) return null;
        return (
          <div key={mech}>
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted">
              {MECHANISM_LABEL[mech]}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {coins.map((coin) => (
                <CoinButton
                  key={coin.id}
                  coin={coin}
                  active={coin.id === selectedId}
                  onClick={() => onSelect(coin)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CoinButton({
  coin,
  active,
  onClick,
}: {
  coin: StablecoinConfig;
  active: boolean;
  onClick: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = coin.logoUrl && !imgFailed;
  const dim = coin.status !== "active";
  return (
    <button
      type="button"
      onClick={onClick}
      title={coin.description}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left transition ${
        active
          ? "border-cream bg-surface"
          : "border-stroke bg-charcoal hover:border-muted"
      } ${dim ? "opacity-60" : ""}`}
    >
      <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-stroke/30 text-base">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coin.logoUrl}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6"
            onError={() => setImgFailed(true)}
          />
        ) : (
          coin.fallbackEmoji
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-cream">
          {coin.symbol}
        </span>
        <span className="block truncate text-[10px] text-muted">
          {coin.status === "collapsed" ? "collapsed" : coin.chain}
        </span>
      </span>
    </button>
  );
}
