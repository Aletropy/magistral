import "server-only";
import { describeDraftingFailure } from "@/lib/minuta/errors";
import { getBatchRepository } from "./getBatchRepository";
import { processBatchItem } from "./processBatchItem";
import { createBatchWorker, type BatchWorker } from "./worker";

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;
/** Rate limits and an overloaded or flaky upstream are worth retrying; bad input and config errors are not. */
const RETRYABLE_STATUSES = new Set([HTTP_TOO_MANY_REQUESTS, HTTP_BAD_GATEWAY, HTTP_SERVICE_UNAVAILABLE]);

/** One worker per server process, kept on globalThis so dev hot reloads don't start more. */
const globalForWorker = globalThis as typeof globalThis & { magistralBatchWorker?: BatchWorker };

export function getBatchWorker(): BatchWorker {
  globalForWorker.magistralBatchWorker ??= createBatchWorker({
    batches: getBatchRepository(),
    processItem: processBatchItem,
    isRetryable: (error) => RETRYABLE_STATUSES.has(describeDraftingFailure(error).status),
    describeError: (error) => describeDraftingFailure(error).message,
  });
  return globalForWorker.magistralBatchWorker;
}

/** Starts the worker if it isn't running yet; safe to call from every entry point. */
export function ensureBatchWorkerStarted(): BatchWorker {
  const worker = getBatchWorker();
  worker.start();
  return worker;
}
