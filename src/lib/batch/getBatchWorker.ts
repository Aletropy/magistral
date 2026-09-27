import "server-only";
import { runAsUser } from "@/lib/auth/actor";
import { toPublicError } from "@/lib/errors/toPublicError";
import { publishActivity } from "@/lib/events/activityEvents";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";
import { isRetryableFailure } from "@/lib/queue/retryPolicy";
import { getLlmSlots } from "@/lib/queue/slotPool";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { describeFinishedJob } from "./describeFinishedJob";
import { getBatchRepository } from "./getBatchRepository";
import { processBatchItem } from "./processBatchItem";
import { createBatchWorker, type BatchWorker } from "./worker";

/** One worker per server process, kept on globalThis so dev hot reloads don't start more. */
const globalForWorker = globalThis as typeof globalThis & { magistralBatchWorker?: BatchWorker };

export function getBatchWorker(): BatchWorker {
  globalForWorker.magistralBatchWorker ??= createBatchWorker({
    batches: getBatchRepository(),
    // LLM calls of an item are attributed to the job's owner.
    processItem: (item, signal) => runAsUser(item.ownerId, () => processBatchItem(item, signal)),
    // One pool of LLM slots for batches and background tasks, and waiting tasks (a user's draft or chat
    // reply) go first.
    slots: getLlmSlots(),
    shouldYield: () => getTaskRepository().countDue("llm", new Date()) > 0,
    onActivity: publishActivity,
    isRetryable: (error) => isRetryableFailure(toPublicError(error)),
    describeError: (error) => toPublicError(error).message,
    onJobFinished: (job) =>
      getNotificationRepository().create({ ...describeFinishedJob(job), ownerId: job.ownerId, taskId: null }),
  });
  return globalForWorker.magistralBatchWorker;
}

/** Starts the worker if it isn't running yet; safe to call from every entry point. */
export function ensureBatchWorkerStarted(): BatchWorker {
  const worker = getBatchWorker();
  worker.start();
  return worker;
}
