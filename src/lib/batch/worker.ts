import type { BatchRepository } from "./repository";
import type { ClaimedBatchItem } from "./types";

export const BATCH_CONCURRENCY = 2;
/** With the backoff below, an item keeps trying for about 4 minutes, enough to ride out per-minute rate limits. */
export const BATCH_MAX_ATTEMPTS = 5;
export const BATCH_RETRY_BASE_MS = 15_000;
export const BATCH_RETRY_MAX_MS = 120_000;
export const BATCH_POLL_INTERVAL_MS = 5_000;

export interface BatchWorkerOptions {
  batches: BatchRepository;
  /** Drafts one item and returns its Markdown, or throws. */
  processItem: (item: ClaimedBatchItem) => Promise<string>;
  /** Transient failures (rate limits, overloaded upstream) are retried with backoff. */
  isRetryable: (error: unknown) => boolean;
  /** A pt-BR message for the item list. */
  describeError: (error: unknown) => string;
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

/** Exponential backoff: 15 s, 30 s, 60 s, 120 s (the cap). */
export function retryDelayMs(attempt: number): number {
  return Math.min(BATCH_RETRY_BASE_MS * 2 ** (attempt - 1), BATCH_RETRY_MAX_MS);
}

export function createBatchWorker(options: BatchWorkerOptions): BatchWorker {
  const {
    batches,
    processItem,
    isRetryable,
    describeError,
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
