import "server-only";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";
import { isRetryableFailure } from "@/lib/queue/retryPolicy";
import { describeTaskFailure } from "./describeTaskFailure";
import { getTaskRepository } from "./getTaskRepository";
import type { TaskHandler } from "./handler";
import { TASK_HANDLERS } from "./registry";
import type { NewTaskFile } from "./types";
import { createTaskWorker, type TaskWorker } from "./worker";

/** Finished tasks and notifications older than this are deleted when the server starts. */
export const TASK_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One worker per server process, kept on globalThis so dev hot reloads don't start more. Its handlers are
 * the code loaded when it started: restart the dev server after changing a task handler.
 */
const globalForWorker = globalThis as typeof globalThis & {
  magistralTaskWorker?: TaskWorker;
  magistralTaskWorkerStarted?: boolean;
};

export function getTaskWorker(): TaskWorker {
  globalForWorker.magistralTaskWorker ??= createTaskWorker({
    tasks: getTaskRepository(),
    handlers: Object.values(TASK_HANDLERS),
    isRetryable: (error) => isRetryableFailure(describeTaskFailure(error)),
    describeError: (error) => describeTaskFailure(error).message,
    notify: (notification) => getNotificationRepository().create(notification),
  });
  return globalForWorker.magistralTaskWorker;
}

/** Starts the worker if it isn't running yet, first purging old history; safe to call from every entry point. */
export function ensureTaskWorkerStarted(): TaskWorker {
  const worker = getTaskWorker();
  if (!globalForWorker.magistralTaskWorkerStarted) {
    const cutoff = new Date(Date.now() - TASK_RETENTION_DAYS * DAY_MS);
    getTaskRepository().purgeFinishedBefore(cutoff);
    getNotificationRepository().purgeBefore(cutoff);
    worker.start();
    globalForWorker.magistralTaskWorkerStarted = true;
  }
  return worker;
}

export interface TaskRequest<P> {
  title: string;
  payload: P;
  files?: NewTaskFile[];
}

/** Queues a task for `handler` and wakes the worker; returns the task's id. */
export function enqueueTask<P>(handler: TaskHandler<P, unknown>, request: TaskRequest<P>): string {
  const id = getTaskRepository().create({
    kind: handler.kind,
    lane: handler.lane,
    title: request.title,
    payload: request.payload,
    files: request.files,
  });
  ensureTaskWorkerStarted().wake();
  return id;
}
