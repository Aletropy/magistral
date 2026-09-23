import "server-only";
import { describeDraftingFailure } from "@/lib/minuta/errors";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";
import { isRetryableFailure } from "@/lib/queue/retryPolicy";
import { describeFinishedJob } from "./describeFinishedJob";
import { getBatchRepository } from "./getBatchRepository";
import { processBatchItem } from "./processBatchItem";
import { createBatchWorker, type BatchWorker } from "./worker";

/** One worker per server process, kept on globalThis so dev hot reloads don't start more. */
const globalForWorker = globalThis as typeof globalThis & { magistralBatchWorker?: BatchWorker };

export function getBatchWorker(): BatchWorker {
  globalForWorker.magistralBatchWorker ??= createBatchWorker({
    batches: getBatchRepository(),
    processItem: processBatchItem,
    isRetryable: (error) => isRetryableFailure(describeDraftingFailure(error)),
    describeError: (error) => describeDraftingFailure(error).message,
    onJobFinished: (job) => getNotificationRepository().create({ ...describeFinishedJob(job), taskId: null }),
  });
  return globalForWorker.magistralBatchWorker;
}

/** Starts the worker if it isn't running yet; safe to call from every entry point. */
export function ensureBatchWorkerStarted(): BatchWorker {
  const worker = getBatchWorker();
  worker.start();
  return worker;
}
