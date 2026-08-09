import { runSimulationFor } from "./dispatch";
import type { SimulationParams, SimulationResult } from "./types";

/**
 * Simulation worker: runs the 10k–50k-path loops off the main thread,
 * streams partial fans in batches, and transfers (not clones) the final
 * Float64Array matrices back. Cancellation is handled by the owner
 * terminating the worker — a busy worker can't observe messages mid-run.
 */

export type SimRequest = {
  runId: number;
  coinId: string;
  ethPrice: number;
  btcPrice: number;
  params: SimulationParams;
};

export type SimBatchMsg = {
  type: "batch";
  runId: number;
  /** Path index this chunk starts at. */
  start: number;
  count: number;
  pathLen: number;
  total: number;
  /** Rows [start, start+count) of the matrix, transferred. */
  data: Float64Array;
  depegDays: (number | null)[];
};

export type SimDoneMsg = {
  type: "done";
  runId: number;
  result: SimulationResult;
  elapsedMs: number;
};

export type SimErrorMsg = {
  type: "error";
  runId: number;
  message: string;
};

export type SimResponse = SimBatchMsg | SimDoneMsg | SimErrorMsg;

type WorkerScope = {
  postMessage(message: SimResponse, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<SimRequest>) => void) | null;
};

const ctx = self as unknown as WorkerScope;

ctx.onmessage = (e: MessageEvent<SimRequest>) => {
  const { runId, coinId, ethPrice, btcPrice, params } = e.data;
  try {
    const t0 = performance.now();
    let sent = 0;
    const result = runSimulationFor(coinId, ethPrice, btcPrice, params, {
      onBatch: (m, depegDays, done) => {
        if (done <= sent) return;
        const chunk = m.data.slice(sent * m.pathLen, done * m.pathLen);
        ctx.postMessage(
          {
            type: "batch",
            runId,
            start: sent,
            count: done - sent,
            pathLen: m.pathLen,
            total: m.numPaths,
            data: chunk,
            depegDays: depegDays.slice(sent, done),
          },
          [chunk.buffer]
        );
        sent = done;
      },
    });
    const elapsedMs = performance.now() - t0;
    const transfers: Transferable[] = [result.paths.data.buffer];
    if (result.luna) transfers.push(result.luna.paths.data.buffer);
    ctx.postMessage({ type: "done", runId, result, elapsedMs }, transfers);
  } catch (err) {
    ctx.postMessage({
      type: "error",
      runId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
