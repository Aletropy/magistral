import { retryDelayMs } from "@/lib/queue/retryPolicy";
import { createSlotPool, type SlotPool } from "@/lib/queue/slotPool";
import type { BatchRepository } from "./repository";
import type { BatchJobSummary, ClaimedBatchItem } from "./types";

export const BATCH_CONCURRENCY = 2;
/** With the shared backoff, an item keeps trying for about 4 minutes, enough to ride out per-minute rate limits. */
export const BATCH_MAX_ATTEMPTS = 5;
export const BATCH_POLL_INTERVAL_MS = 5_000;
/** Recorded on an item that was running when the server stopped and had no attempts left. */
export const INTERRUPTED_ITEM_MESSAGE = "A geração foi interrompida porque o servidor reiniciou.";

export interface BatchWorkerOptions {
  batches: BatchRepository;
  /** Drafts one item and returns its Markdown, or throws; aborting the signal cancels the LLM call. */
  processItem: (item: ClaimedBatchItem, signal: AbortSignal) => Promise<string>;
  /** Transient failures (rate limits, overloaded upstream) are retried with backoff. */
  isRetryable: (error: unknown) => boolean;
  /** A pt-BR message for the item list. */
  describeError: (error: unknown) => string;
  /** Called once when a job has no pending or running items left. */
  onJobFinished?: (job: BatchJobSummary) => void;
  /** Called when an item of the owner's job starts or ends, so their open pages can refresh. */
  onActivity?: (ownerId: string | null) => void;
  /** LLM slots shared with the task worker; by default the batch worker has its own. */
  slots?: SlotPool;
  /** True while interactive work is waiting for a slot: batch items then leave it the next free slot. */
  shouldYield?: () => boolean;
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
  /** Aborts the job's items that are being drafted right now, e.g. because the job was deleted. */
  cancelJob(jobId: string): number;
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
    slots = createSlotPool(concurrency),
    shouldYield = () => false,
    onActivity = () => {},
    maxAttempts = BATCH_MAX_ATTEMPTS,
    pollIntervalMs = BATCH_POLL_INTERVAL_MS,
    now = () => new Date(),
  } = options;
  let running = false;
  let wakeUp: (() => void) | null = null;
  const inFlight = new Map<number, { jobId: string; controller: AbortController }>();

  async function processOne(item: ClaimedBatchItem): Promise<void> {
    const controller = new AbortController();
    inFlight.set(item.id, { jobId: item.jobId, controller });
    onActivity(item.ownerId);
    try {
      batches.completeItem(item.id, await processItem(item, controller.signal));
    } catch (error) {
      // A cancelled item belonged to a deleted job: its row is already gone.
      if (controller.signal.aborted) return;
      const message = describeError(error);
      if (isRetryable(error) && item.attempts < maxAttempts) {
        batches.retryItem(item.id, message, new Date(now().getTime() + retryDelayMs(item.attempts)));
      } else {
        batches.failItem(item.id, message);
      }
    } finally {
      inFlight.delete(item.id);
      slots.release();
    }
    const finished = batches.markFinishedIfDone(item.jobId, now());
    if (finished) notifyFinished(finished);
    onActivity(item.ownerId);
  }

  function notifyFinished(job: BatchJobSummary): void {
    try {
      onJobFinished?.(job);
    } catch (error) {
      console.error("[batch] job-finished hook failed", error);
    }
  }

  async function tick(): Promise<number> {
    if (shouldYield()) return 0;
    const granted = slots.tryAcquire(concurrency);
    const items = granted > 0 ? batches.claimItems(granted, now()) : [];
    slots.release(granted - items.length);
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

  slots.onRelease(() => wakeUp?.());

  return {
    start() {
      if (running) return;
      running = true;
      batches.resetRunningItems(maxAttempts, INTERRUPTED_ITEM_MESSAGE);
      void loop();
    },
    stop() {
      running = false;
      wakeUp?.();
    },
    wake: () => wakeUp?.(),
    cancelJob(jobId) {
      let canceled = 0;
      for (const { jobId: itemJobId, controller } of inFlight.values()) {
        if (itemJobId !== jobId) continue;
        controller.abort();
        canceled++;
      }
      return canceled;
    },
    tick,
  };
}
