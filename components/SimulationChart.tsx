"use client";

import { useEffect, useRef, useState } from "react";
import type { PartialFan } from "@/lib/useSimulation";
import type { PathMatrix, SimulationResult } from "@/lib/types";

type Props = {
  /** Completed run, or null while the first run is still streaming in. */
  result: SimulationResult | null;
  /** In-flight fan: when set, the chart draws it converging batch by batch. */
  partial?: PartialFan | null;
  currentPrice: number;
  /** Ratio form, e.g. 1.45 = 145% */
  liquidationThreshold: number;
  /** Ratio form, e.g. 1.5 = 150% */
  collateralRatio: number;
  elapsedMs: number | null;
  /** Override the computed threshold line (USDe passes 0 = reserve depletion). */
  thresholdOverride?: number;
  /** Label next to the threshold line (default "liq $X"). */
  thresholdLabel?: string;
  /** Formats axis numbers. Default: whole dollars. */
  formatValue?: (n: number) => string;
  /** Re-roll: rerun with a fresh seed. Omit to hide the button (e.g. secondary charts). */
  onReroll?: () => void;
};

export function SimulationChart({
  result,
  partial = null,
  currentPrice,
  liquidationThreshold,
  collateralRatio,
  elapsedMs,
  thresholdOverride,
  thresholdLabel,
  formatValue,
  onReroll,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Bumped by the ResizeObserver so the draw effect re-runs at the new width.
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    let lastWidth = wrap.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (w !== lastWidth) {
        lastWidth = w;
        setResizeTick((t) => t + 1);
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const liqPrice =
    thresholdOverride !== undefined
      ? thresholdOverride
      : currentPrice * (liquidationThreshold / collateralRatio);
  const fmt = formatValue ?? ((n: number) => `$${n.toFixed(0)}`);
  const threshLabel = thresholdLabel ?? `liq ${fmt(liqPrice)}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !overlay || !wrap) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cssWidth = wrap.clientWidth;
    const cssHeight = 400;

    for (const c of [canvas, overlay]) {
      c.width = Math.floor(cssWidth * dpr);
      c.height = Math.floor(cssHeight * dpr);
      c.style.width = `${cssWidth}px`;
      c.style.height = `${cssHeight}px`;
    }

    if (partial && partial.count > 0) {
      drawPartial(canvas, overlay, partial, liqPrice, dpr, cssWidth, cssHeight);
    } else if (result) {
      drawSpaghetti(canvas, result, currentPrice, liqPrice, dpr);
      drawOverlay(
        overlay,
        result,
        currentPrice,
        liqPrice,
        dpr,
        cssWidth,
        cssHeight,
        fmt,
        threshLabel
      );
    }
  }, [result, partial, currentPrice, liqPrice, fmt, threshLabel, resizeTick]);

  return (
    <div className="space-y-4">
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-xl border border-stroke bg-surface/30 p-3"
        style={{ height: 400 }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
        />
        <canvas
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>
      <ChartFooter
        result={result}
        partial={partial}
        elapsedMs={elapsedMs}
        onReroll={onReroll}
      />
    </div>
  );
}

/** min/max over rows [0, count) of a matrix. */
function matrixBounds(
  data: Float64Array,
  count: number,
  pathLen: number
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  const n = count * pathLen;
  for (let i = 0; i < n; i++) {
    const v = data[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) max = min + 1;
  return { min, max };
}

function priceBounds(
  result: SimulationResult,
  currentPrice: number,
  liqPrice: number
): { min: number; max: number } {
  let min = result.percentile5Path[0] ?? currentPrice;
  let max = result.percentile95Path[0] ?? currentPrice;
  for (const p of result.percentile5Path) if (p < min) min = p;
  for (const p of result.percentile95Path) if (p > max) max = p;
  min = Math.min(min, liqPrice, result.worstPath[result.worstPath.length - 1]);
  max = Math.max(max, currentPrice * 1.02);
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

function strokePaths(
  ctx: CanvasRenderingContext2D,
  data: Float64Array,
  count: number,
  pathLen: number,
  depegDays: (number | null)[],
  xOf: (d: number) => number,
  yOf: (p: number) => number
) {
  const days = pathLen - 1;
  const safe = new Path2D();
  const depeg = new Path2D();
  for (let i = 0; i < count; i++) {
    const base = i * pathLen;
    const target = depegDays[i] !== null ? depeg : safe;
    target.moveTo(xOf(0), yOf(data[base]));
    for (let d = 1; d <= days; d++) {
      target.lineTo(xOf(d), yOf(data[base + d]));
    }
  }
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = "#60A5FA";
  ctx.stroke(safe);
  ctx.strokeStyle = "#F87171";
  ctx.globalAlpha = 0.05;
  ctx.stroke(depeg);
  ctx.globalAlpha = 1;
}

/** In-flight fan: rows so far + a progress note, no percentile overlay yet. */
function drawPartial(
  canvas: HTMLCanvasElement,
  overlay: HTMLCanvasElement,
  partial: PartialFan,
  liqPrice: number,
  dpr: number,
  cssWidth: number,
  cssHeight: number
) {
  const ctx = canvas.getContext("2d");
  const octx = overlay.getContext("2d");
  if (!ctx || !octx) return;
  const { data, count, pathLen, depegDays, total } = partial;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  ctx.clearRect(0, 0, W, H);

  let { min, max } = matrixBounds(data, count, pathLen);
  min = Math.min(min, liqPrice);
  const pad = (max - min) * 0.08;
  min -= pad;
  max += pad;

  const days = pathLen - 1;
  const xOf = (d: number) => (d / days) * (W - 1);
  const yOf = (p: number) =>
    H - 1 - ((p - min) / Math.max(max - min, 1e-9)) * (H - 2);

  strokePaths(ctx, data, count, pathLen, depegDays, xOf, yOf);

  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  octx.clearRect(0, 0, cssWidth, cssHeight);
  octx.fillStyle = "#A8A29E";
  octx.font = "11px ui-monospace, SFMono-Regular, monospace";
  octx.fillText(
    `${count.toLocaleString()} / ${total.toLocaleString()} paths…`,
    6,
    14
  );
}

function drawSpaghetti(
  canvas: HTMLCanvasElement,
  result: SimulationResult,
  currentPrice: number,
  liqPrice: number,
  dpr: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  ctx.clearRect(0, 0, W, H);

  const m: PathMatrix = result.paths;
  if (m.numPaths === 0) return;

  const days = m.pathLen - 1;
  const { min, max } = priceBounds(result, currentPrice, liqPrice);
  const xOf = (d: number) => (d / days) * (W - 1);
  const yOf = (p: number) =>
    H - 1 - ((p - min) / Math.max(max - min, 1e-9)) * (H - 2);

  strokePaths(ctx, m.data, m.numPaths, m.pathLen, result.depegDays, xOf, yOf);
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  result: SimulationResult,
  currentPrice: number,
  liqPrice: number,
  dpr: number,
  cssWidth: number,
  cssHeight: number,
  fmt: (n: number) => string,
  threshLabel: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = cssWidth;
  const H = cssHeight;
  ctx.clearRect(0, 0, W, H);

  const days = result.paths.pathLen - 1;
  const { min, max } = priceBounds(result, currentPrice, liqPrice);
  const xOf = (d: number) => (d / days) * (W - 1);
  const yOf = (p: number) =>
    H - 1 - ((p - min) / Math.max(max - min, 1e-9)) * (H - 2);

  ctx.strokeStyle = "rgba(168,162,158,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 0.5);
  ctx.lineTo(W, H - 0.5);
  ctx.moveTo(0.5, 0);
  ctx.lineTo(0.5, H);
  ctx.stroke();

  ctx.strokeStyle = "#F87171";
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  const y = yOf(liqPrice);
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();
  ctx.setLineDash([]);

  drawLine(ctx, result.percentile95Path, xOf, yOf, "#F5F3EE", 1.25, [4, 4]);
  drawLine(ctx, result.percentile5Path, xOf, yOf, "#F5F3EE", 1.25, [4, 4]);
  drawLine(ctx, result.medianPath, xOf, yOf, "#F5F3EE", 2.25);

  ctx.fillStyle = "#F87171";
  ctx.font = "11px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(threshLabel, 6, y - 4);
  ctx.fillStyle = "#F5F3EE";
  ctx.fillText(`median`, W - 54, yOf(result.medianPath[days]) - 4);

  ctx.fillStyle = "#A8A29E";
  ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(fmt(max), 6, 12);
  ctx.fillText(fmt(min), 6, H - 6);
  ctx.fillText(`day 0`, 6, H - 20);
  ctx.fillText(`day ${days}`, W - 48, H - 6);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  path: number[],
  xOf: (d: number) => number,
  yOf: (p: number) => number,
  color: string,
  width: number,
  dash: number[] = []
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(path[0]));
  for (let d = 1; d < path.length; d++) {
    ctx.lineTo(xOf(d), yOf(path[d]));
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function ChartFooter({
  result,
  partial,
  elapsedMs,
  onReroll,
}: {
  result: SimulationResult | null;
  partial: PartialFan | null;
  elapsedMs: number | null;
  onReroll?: () => void;
}) {
  if (!result) {
    return (
      <div className="rounded-xl border border-stroke bg-surface/30 px-5 py-4 font-mono text-sm text-muted">
        {partial
          ? `Simulating… ${partial.count.toLocaleString()} / ${partial.total.toLocaleString()} paths`
          : "Simulating…"}
      </div>
    );
  }
  const pct = result.depegProbability * 100;
  const ciHalf =
    ((result.depegProbabilityCI[1] - result.depegProbabilityCI[0]) / 2) * 100;
  const color =
    pct < 5 ? "text-emerald-400" : pct < 15 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 rounded-xl border border-stroke bg-surface/30 px-5 py-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Depeg probability
        </p>
        <p className={`mt-1 font-mono text-3xl font-semibold ${color}`}>
          {pct.toFixed(2)}%
          <span className="ml-2 align-middle text-sm font-normal text-muted">
            ± {ciHalf.toFixed(2)}%
          </span>
        </p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Paths
        </p>
        <p className="mt-1 font-mono text-lg text-cream">
          {result.paths.numPaths.toLocaleString()}
        </p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Exec time
        </p>
        <p className="mt-1 font-mono text-lg text-cream">
          {elapsedMs !== null ? `${elapsedMs.toFixed(0)} ms` : "—"}
        </p>
      </div>
      <div className="ml-auto">
        <p className="text-right text-[11px] uppercase tracking-[0.18em] text-muted">
          Seed
        </p>
        <p className="mt-1 flex items-center gap-2 font-mono text-xs text-muted">
          <span>{result.seed}</span>
          {onReroll && (
            <button
              onClick={onReroll}
              title="Re-roll: rerun with a fresh random seed"
              aria-label="Re-roll simulation"
              className="rounded-md border border-stroke bg-charcoal px-2 py-1 text-sm transition hover:border-cream/60 hover:bg-stroke/40"
            >
              🎲
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
