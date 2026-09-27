import "server-only";
import { getSessionRepository } from "@/lib/auth/getAuthRepositories";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";
import { isRetryableFailure } from "@/lib/queue/retryPolicy";
import { describeTaskFailure } from "./describeTaskFailure";
import { getTaskRepository } from "./getTaskRepository";
import { TaskQuotaError } from "./errors";
import type { TaskHandler } from "./handler";
import { TASK_HANDLERS } from "./registry";
import type { NewTaskFile } from "./types";
import { createTaskWorker, type TaskWorker } from "./worker";

/** Finished tasks and notifications older than this are deleted when the server starts, then once a day. */
export const TASK_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = DAY_MS;

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

/** Deletes finished tasks (with any document text they still hold), old notifications and expired sessions. */
function purgeOldRecords(): void {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - TASK_RETENTION_DAYS * DAY_MS);
    getTaskRepository().purgeFinishedBefore(cutoff);
    getNotificationRepository().purgeBefore(cutoff);
    getSessionRepository().purgeExpired(now);
  } catch (error) {
    console.error("[tasks] failed to purge old records", error);
  }
}

/** Starts the worker if it isn't running yet, purging old records now and daily; safe to call from every entry point. */
export function ensureTaskWorkerStarted(): TaskWorker {
  const worker = getTaskWorker();
  if (!globalForWorker.magistralTaskWorkerStarted) {
    purgeOldRecords();
    setInterval(purgeOldRecords, PURGE_INTERVAL_MS).unref();
    worker.start();
    globalForWorker.magistralTaskWorkerStarted = true;
  }
  return worker;
}

/** How many AI tasks one person may have queued or running at once, so nobody drains the shared quota. */
export const MAX_ACTIVE_LLM_TASKS_PER_USER = 5;
const TOO_MANY_TASKS_MESSAGE = `Você já tem ${MAX_ACTIVE_LLM_TASKS_PER_USER} tarefas de IA na fila. Aguarde alguma terminar ou cancele uma em Tarefas.`;

export interface TaskRequest<P> {
  ownerId: string;
  title: string;
  payload: P;
  files?: NewTaskFile[];
}

/** Queues a task for `handler` and wakes the worker; returns the task's id. Throws TaskQuotaError. */
export function enqueueTask<P>(handler: TaskHandler<P, unknown>, request: TaskRequest<P>): string {
  const tasks = getTaskRepository();
  if (handler.lane === "llm" && tasks.countActive(request.ownerId, "llm") >= MAX_ACTIVE_LLM_TASKS_PER_USER) {
    throw new TaskQuotaError(TOO_MANY_TASKS_MESSAGE);
  }
  const id = tasks.create({
    ownerId: request.ownerId,
    kind: handler.kind,
    lane: handler.lane,
    title: request.title,
    payload: request.payload,
    files: request.files,
  });
  ensureTaskWorkerStarted().wake();
  return id;
}
