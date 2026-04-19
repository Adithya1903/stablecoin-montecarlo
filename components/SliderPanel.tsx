"use client";

import type { SimulationParams } from "@/lib/types";

type Props = {
  params: SimulationParams;
  onChange: (next: SimulationParams) => void;
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
];

export function SliderPanel({ params, onChange }: Props) {
  const patch = (p: Partial<SimulationParams>) =>
    onChange({ ...params, ...p });

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
        value={params.initialCrash}
        min={-0.6}
        max={0}
        step={0.05}
        display={signedPct(params.initialCrash)}
        subtitle="Force a crash on the first day. -50% = Black Thursday."
        onChange={(v) => patch({ initialCrash: v })}
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
        value={params.liquidationThreshold}
        min={1.0}
        max={1.8}
        step={0.05}
        display={pct(params.liquidationThreshold)}
        onChange={(v) => patch({ liquidationThreshold: v })}
      />
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
