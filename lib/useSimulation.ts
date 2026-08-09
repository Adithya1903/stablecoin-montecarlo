"use client";

import { useEffect, useRef, useState } from "react";
import type { SimResponse } from "./simWorker";
import type { SimulationParams, SimulationResult } from "./types";

export type RunState = {
  result: SimulationResult;
  elapsedMs: number;
  params: SimulationParams;
};

/** A fan still being generated: rows [0, count) of the matrix are valid. */
export type PartialFan = {
  data: Float64Array;
  depegDays: (number | null)[];
  count: number;
  total: number;
  pathLen: number;
};

function validateResult(r: SimulationResult): string | null {
  if (!(r.depegProbability >= 0 && r.depegProbability <= 1)) {
    return `depegProbability out of range: ${r.depegProbability}`;
  }
  const { data, numPaths, pathLen } = r.paths;
  for (let i = 0; i < numPaths * pathLen; i++) {
    const v = data[i];
    if (!Number.isFinite(v) || v < 0) {
      return `invalid path value at [${Math.floor(i / pathLen)}][${i % pathLen}] = ${v}`;
    }
  }
  return null;
}

/**
 * Debounced worker-backed simulation. A param change while a run is in
 * flight terminates the worker and respawns it, so at most one run is
 * ever active; stale messages are filtered by runId. Batches stream in
 * as a PartialFan so the chart can draw the fan converging.
 */
export function useSimulation({
  coinId,
  ethPrice,
  btcPrice,
  params,
  enabled,
  debounceMs = 300,
}: {
  coinId: string;
  ethPrice: number;
  btcPrice: number;
  params: SimulationParams;
  enabled: boolean;
  debounceMs?: number;
}): {
  run: RunState | null;
  partial: PartialFan | null;
  pending: boolean;
  error: string | null;
} {
  const [run, setRun] = useState<RunState | null>(null);
  const [partial, setPartial] = useState<PartialFan | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const runIdRef = useRef(0);
  const partialRef = useRef<PartialFan | null>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPending(false);
      return;
    }
    setPending(true);
    setError(null);

    const timer = setTimeout(() => {
      const runId = ++runIdRef.current;
      partialRef.current = null;
      setPartial(null);

      // Cancellation: a busy worker can't check a flag mid-loop, so kill
      // it and let the next spawn pick up the latest params.
      if (busyRef.current && workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        busyRef.current = false;
      }
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("./simWorker.ts", import.meta.url)
        );
      }
      const worker = workerRef.current;

      worker.onmessage = (e: MessageEvent<SimResponse>) => {
        const msg = e.data;
        if (msg.runId !== runIdRef.current) return; // stale run
        if (msg.type === "batch") {
          let fan = partialRef.current;
          if (!fan || fan.total !== msg.total || fan.pathLen !== msg.pathLen) {
            fan = {
              data: new Float64Array(msg.total * msg.pathLen),
              depegDays: new Array(msg.total).fill(null),
              count: 0,
              total: msg.total,
              pathLen: msg.pathLen,
            };
          }
          fan.data.set(msg.data, msg.start * msg.pathLen);
          for (let i = 0; i < msg.count; i++) {
            fan.depegDays[msg.start + i] = msg.depegDays[i];
          }
          const next: PartialFan = { ...fan, count: msg.start + msg.count };
          partialRef.current = next;
          setPartial(next);
        } else if (msg.type === "done") {
          busyRef.current = false;
          partialRef.current = null;
          setPartial(null);
          setPending(false);
          const bad = validateResult(msg.result);
          if (bad) {
            console.error("[sim] sanity check failed:", bad);
            setError(`Sanity check failed: ${bad}`);
            return;
          }
          setRun({ result: msg.result, elapsedMs: msg.elapsedMs, params });
        } else {
          busyRef.current = false;
          partialRef.current = null;
          setPartial(null);
          setPending(false);
          setError(msg.message);
        }
      };
      worker.onerror = (e) => {
        if (runId !== runIdRef.current) return;
        busyRef.current = false;
        setPending(false);
        setError(e.message || "Simulation worker crashed");
      };

      busyRef.current = true;
      worker.postMessage({ runId, coinId, ethPrice, btcPrice, params });
    }, debounceMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId, ethPrice, btcPrice, params, enabled, debounceMs]);

  return { run, partial, pending, error };
}
