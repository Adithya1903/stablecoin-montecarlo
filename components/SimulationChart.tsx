"use client";

import { useEffect, useRef } from "react";
import type { SimulationResult } from "@/lib/types";

type Props = {
  result: SimulationResult;
  currentPrice: number;
  /** Ratio form, e.g. 1.45 = 145% */
  liquidationThreshold: number;
  /** Ratio form, e.g. 1.5 = 150% */
  collateralRatio: number;
  elapsedMs: number | null;
};

export function SimulationChart({
  result,
  currentPrice,
  liquidationThreshold,
  collateralRatio,
  elapsedMs,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const liqPrice = currentPrice * (liquidationThreshold / collateralRatio);

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

    drawSpaghetti(canvas, result, currentPrice, liqPrice, dpr);
    drawOverlay(
      overlay,
      result,
      currentPrice,
      liqPrice,
      dpr,
      cssWidth,
      cssHeight
    );
  }, [result, currentPrice, liqPrice]);

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
        depegProbability={result.depegProbability}
        pathCount={result.paths.length}
        elapsedMs={elapsedMs}
      />
    </div>
  );
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

  const { paths, depegDays } = result;
  if (paths.length === 0) return;

  const days = paths[0].length - 1;
  const { min, max } = priceBounds(result, currentPrice, liqPrice);
  const xOf = (d: number) => (d / days) * (W - 1);
  const yOf = (p: number) =>
    H - 1 - ((p - min) / Math.max(max - min, 1e-9)) * (H - 2);

  const safe = new Path2D();
  const depeg = new Path2D();
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const target = depegDays[i] !== null ? depeg : safe;
    target.moveTo(xOf(0), yOf(path[0]));
    for (let d = 1; d <= days; d++) {
      target.lineTo(xOf(d), yOf(path[d]));
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

function drawOverlay(
  canvas: HTMLCanvasElement,
  result: SimulationResult,
  currentPrice: number,
  liqPrice: number,
  dpr: number,
  cssWidth: number,
  cssHeight: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = cssWidth;
  const H = cssHeight;
  ctx.clearRect(0, 0, W, H);

  const days = result.paths[0].length - 1;
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
  ctx.fillText(`liq $${liqPrice.toFixed(0)}`, 6, y - 4);
  ctx.fillStyle = "#F5F3EE";
  ctx.fillText(`median`, W - 54, yOf(result.medianPath[days]) - 4);

  ctx.fillStyle = "#A8A29E";
  ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(`$${max.toFixed(0)}`, 6, 12);
  ctx.fillText(`$${min.toFixed(0)}`, 6, H - 6);
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
  depegProbability,
  pathCount,
  elapsedMs,
}: {
  depegProbability: number;
  pathCount: number;
  elapsedMs: number | null;
}) {
  const pct = depegProbability * 100;
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
        </p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Paths
        </p>
        <p className="mt-1 font-mono text-lg text-cream">
          {pathCount.toLocaleString()}
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
    </div>
  );
}
