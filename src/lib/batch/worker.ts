import { retryDelayMs } from "@/lib/queue/retryPolicy";
import type { BatchRepository } from "./repository";
import type { BatchJobSummary, ClaimedBatchItem } from "./types";

export const BATCH_CONCURRENCY = 2;
/** With the shared backoff, an item keeps trying for about 4 minutes, enough to ride out per-minute rate limits. */
export const BATCH_MAX_ATTEMPTS = 5;
export const BATCH_POLL_INTERVAL_MS = 5_000;

export interface BatchWorkerOptions {
  batches: BatchRepository;
  /** Drafts one item and returns its Markdown, or throws. */
  processItem: (item: ClaimedBatchItem) => Promise<string>;
  /** Transient failures (rate limits, overloaded upstream) are retried with backoff. */
  isRetryable: (error: unknown) => boolean;
  /** A pt-BR message for the item list. */
  describeError: (error: unknown) => string;
  /** Called once when a job has no pending or running items left. */
  onJobFinished?: (job: BatchJobSummary) => void;
  concurrency?: number;
  maxAttempts?: number;
  pollIntervalMs?: number;
  now?: () => Date;
}

export interface BatchWorker {
  /** Requeues items a previous process left running, then keeps draining the queue until stopped. */
  start(): void;
  stop(): void;
  /** Checks the queue now instead of waiting for the next poll, e.g. right after a job is created. */
  wake(): void;
  /** Claims and processes one wave of due items; resolves with how many were processed. */
  tick(): Promise<number>;
}

export function createBatchWorker(options: BatchWorkerOptions): BatchWorker {
  const {
    batches,
    processItem,
    isRetryable,
    describeError,
    onJobFinished,
    concurrency = BATCH_CONCURRENCY,
    maxAttempts = BATCH_MAX_ATTEMPTS,
    pollIntervalMs = BATCH_POLL_INTERVAL_MS,
    now = () => new Date(),
  } = options;
  let running = false;
  let wakeUp: (() => void) | null = null;

  async function processOne(item: ClaimedBatchItem): Promise<void> {
    try {
      batches.completeItem(item.id, await processItem(item));
    } catch (error) {
      const message = describeError(error);
      if (isRetryable(error) && item.attempts < maxAttempts) {
        batches.retryItem(item.id, message, new Date(now().getTime() + retryDelayMs(item.attempts)));
      } else {
        batches.failItem(item.id, message);
      }
    }
    const finished = batches.markFinishedIfDone(item.jobId, now());
    if (finished) notifyFinished(finished);
  }

  function notifyFinished(job: BatchJobSummary): void {
    try {
      onJobFinished?.(job);
    } catch (error) {
      console.error("[batch] job-finished hook failed", error);
    }
  }

  async function tick(): Promise<number> {
    const items = batches.claimItems(concurrency, now());
    await Promise.all(items.map(processOne));
    return items.length;
  }

  function idle(): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(done, pollIntervalMs);
      timer.unref?.();
      function done() {
        clearTimeout(timer);
        wakeUp = null;
        resolve();
      }
      wakeUp = done;
    });
  }

  async function loop(): Promise<void> {
    while (running) {
      try {
        if ((await tick()) === 0) await idle();
      } catch (error) {
        console.error("[batch] worker iteration failed", error);
        await idle();
      }
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      batches.resetRunningItems();
      void loop();
    },
    stop() {
      running = false;
      wakeUp?.();
    },
    wake: () => wakeUp?.(),
    tick,
  };
}
