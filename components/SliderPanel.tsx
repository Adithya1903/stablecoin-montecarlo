"use client";

import type { SimulationParams } from "@/lib/types";

type Props = {
  params: SimulationParams;
  onChange: (next: SimulationParams) => void;
  selectedId?: string;
};

type Preset = {
  label: string;
  patch: Partial<SimulationParams>;
};

const PRESETS: Preset[] = [
  {
    label: "Normal Market",
    patch: { volatility: 0.04, initialCrash: 0, collateralRatio: 1.5 },
  },
  {
    label: "Black Thursday",
    patch: { volatility: 0.08, initialCrash: -0.4, collateralRatio: 1.5 },
  },
  {
    label: "UST-Style Bank Run",
    patch: { volatility: 0.12, initialCrash: -0.3, collateralRatio: 1.2 },
  },
  {
    label: "Conservative",
    patch: { volatility: 0.04, initialCrash: 0, collateralRatio: 2.0 },
  },
  {
    label: "SVB Crisis",
    patch: { volatility: 0.06, initialCrash: 0, usdcShock: -0.1 },
  },
  {
    label: "Recovery Mode Stress",
    patch: {
      volatility: 0.08,
      initialCrash: -0.2,
      userCR: 1.4,
      systemCR: 1.6,
    },
  },
  {
    label: "Correlated Crash",
    patch: { volatility: 0.08, initialCrash: -0.25, correlation: 1.0 },
  },
  {
    label: "Diversified",
    patch: { volatility: 0.04, initialCrash: 0, correlation: 0.3 },
  },
  {
    label: "Normal Bull Market",
    patch: {
      fundingRateVol: 0.01,
      fundingRateShock: 0,
      reserveFund: 50_000_000,
    },
  },
  {
    label: "Bear Market",
    patch: {
      fundingRateVol: 0.03,
      fundingRateShock: -0.15,
      reserveFund: 50_000_000,
    },
  },
  {
    label: "Extreme Stress",
    patch: {
      fundingRateVol: 0.05,
      fundingRateShock: -0.3,
      reserveFund: 30_000_000,
    },
  },
];

export function SliderPanel({ params, onChange, selectedId }: Props) {
  const patch = (p: Partial<SimulationParams>) =>
    onChange({ ...params, ...p });

  const liqMax = Math.max(1.0, params.collateralRatio - 0.05);
  const liqNearCR =
    params.collateralRatio - params.liquidationThreshold <= 0.1;

  return (
    <div className="rounded-xl border border-stroke bg-surface/60 p-5 space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted mb-2">
          Presets
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => patch(p.patch)}
              className="rounded-md border border-stroke bg-charcoal px-3 py-2 text-xs font-medium text-cream transition hover:border-cream/60 hover:bg-stroke/40"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-stroke" />

      {selectedId === "usde" ? (
        <>
          <Slider
            label="Funding Rate Volatility"
            value={params.fundingRateVol ?? 0.02}
            min={0.005}
            max={0.1}
            step={0.005}
            display={pct(params.fundingRateVol ?? 0.02)}
            subtitle="How much the daily funding rate swings. Higher during volatile markets."
            onChange={(v) => patch({ fundingRateVol: v })}
          />
          <Slider
            label="Day 1 Funding Shock"
            value={-(params.fundingRateShock ?? 0)}
            min={0}
            max={0.5}
            step={0.01}
            display={
              (params.fundingRateShock ?? 0) === 0
                ? "0%"
                : `${((params.fundingRateShock ?? 0) * 100).toFixed(0)}% APR`
            }
            subtitle="Force funding negative on day 1, annualized. -30% APR ≈ severe bear market."
            onChange={(v) => patch({ fundingRateShock: v === 0 ? 0 : -v })}
          />
          <Slider
            label="Reserve Fund"
            value={params.reserveFund ?? 50_000_000}
            min={10_000_000}
            max={200_000_000}
            step={5_000_000}
            display={`$${((params.reserveFund ?? 50_000_000) / 1_000_000).toFixed(0)}M`}
            subtitle="Ethena's insurance fund. Drains during negative funding."
            onChange={(v) => patch({ reserveFund: v })}
          />
          <Slider
            label="Simulation Days"
            value={params.days}
            min={7}
            max={180}
            step={1}
            display={`${params.days} days`}
            onChange={(v) => patch({ days: Math.round(v) })}
          />
        </>
      ) : (
        <>
          <Slider
            label="ETH Volatility"
            value={params.volatility}
            min={0.01}
            max={0.15}
            step={0.005}
            display={pct(params.volatility)}
            subtitle="Historical average is ~4%. Doubles during market panics."
            onChange={(v) => patch({ volatility: v })}
          />

          <Slider
            label="Day 1 Crash"
            value={-params.initialCrash}
            min={0}
            max={0.6}
            step={0.05}
            display={signedPct(params.initialCrash)}
            subtitle="Force a crash on the first day. -50% = Black Thursday."
            onChange={(v) => patch({ initialCrash: -v })}
          />

          <Slider
            label="Simulation Days"
            value={params.days}
            min={7}
            max={90}
            step={1}
            display={`${params.days} days`}
            onChange={(v) => patch({ days: Math.round(v) })}
          />
        </>
      )}

      {selectedId === "usde" ? null : selectedId === "lusd" ? (
        <>
          <Slider
            label="Your CR"
            value={params.userCR ?? 1.5}
            min={1.1}
            max={2.5}
            step={0.05}
            display={pct(params.userCR ?? 1.5)}
            subtitle="Your personal collateralization ratio."
            onChange={(v) => patch({ userCR: v })}
          />
          <Slider
            label="System-wide CR"
            value={params.systemCR ?? 2.5}
            min={1.4}
            max={3.5}
            step={0.05}
            display={pct(params.systemCR ?? 2.5)}
            subtitle="Average CR across all LUSD positions. Below 150% triggers Recovery Mode, which liquidates any position below 150% — even if above the normal 110% threshold."
            onChange={(v) => patch({ systemCR: v })}
          />
        </>
      ) : (
        <>
          <Slider
            label="Collateralization Ratio"
            value={params.collateralRatio}
            min={1.1}
            max={2.0}
            step={0.05}
            display={pct(params.collateralRatio)}
            subtitle="MakerDAO uses 150%. LUSD uses 110%."
            onChange={(v) => patch({ collateralRatio: v })}
          />

          <Slider
            label="Liquidation Threshold"
            value={Math.min(params.liquidationThreshold, liqMax)}
            min={1.0}
            max={liqMax}
            step={0.05}
            display={pct(params.liquidationThreshold)}
            subtitle={
              liqNearCR
                ? "⚠ Close to CR — tiny buffer means frequent liquidations."
                : undefined
            }
            onChange={(v) =>
              patch({ liquidationThreshold: Math.min(v, liqMax) })
            }
          />
        </>
      )}

      {selectedId === "gho" && (
        <Slider
          label="Correlation"
          value={params.correlation ?? 0.7}
          min={0}
          max={1}
          step={0.1}
          display={(params.correlation ?? 0.7).toFixed(1)}
          subtitle="How likely ETH/BTC/LINK crash together. 0 = independent (diversification works). 1 = everything crashes together. Crypto is typically ~0.6–0.8."
          onChange={(v) => patch({ correlation: v })}
        />
      )}

      {selectedId === "dai" && (
        <Slider
          label="USDC Depeg Shock"
          value={-(params.usdcShock ?? 0)}
          min={0}
          max={0.15}
          step={0.01}
          display={
            (params.usdcShock ?? 0) === 0
              ? "0%"
              : `${((params.usdcShock ?? 0) * 100).toFixed(0)}%`
          }
          subtitle="Simulate USDC losing its peg (e.g., SVB scenario). ~35% of DAI backing is USDC."
          onChange={(v) => patch({ usdcShock: v === 0 ? 0 : -v })}
        />
      )}

      {selectedId === "usbd" && (
        <div className="rounded-md border border-stroke bg-charcoal/60 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-cream">
            <input
              type="checkbox"
              checked={!!params.lstBasisRisk}
              onChange={(e) => patch({ lstBasisRisk: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">LST basis risk</span>
              <span className="mt-1 block text-[11px] leading-snug text-muted">
                Simulate stBTC/BTC depeg alongside BTC price. Jumps conditioned
                on BTC drops (stETH / 3AC pattern).
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  subtitle,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  subtitle?: string;
  onChange: (v: number) => void;
}) {
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const trackStyle = {
    background: `linear-gradient(to right, #F5F3EE 0%, #F5F3EE ${frac * 100}%, #44403C ${frac * 100}%, #44403C 100%)`,
  };
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-cream">{label}</label>
        <span className="font-mono text-sm text-cream">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={trackStyle}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-stroke [&::-webkit-slider-thumb]:bg-cream [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-stroke [&::-moz-range-thumb]:bg-cream"
      />
      {subtitle && (
        <p className="mt-1.5 text-[11px] leading-snug text-muted">{subtitle}</p>
      )}
    </div>
  );
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function signedPct(x: number): string {
  if (x === 0) return "0%";
  return `${(x * 100).toFixed(0)}%`;
}
