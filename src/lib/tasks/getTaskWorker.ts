import "server-only";
import path from "node:path";

import { getSessionRepository } from "@/lib/auth/getAuthRepositories";
import { BACKUP_DIR_ENV_VAR, backupDatabase } from "@/lib/db/backup";
import { getDb } from "@/lib/db/client";
import { toPublicError } from "@/lib/errors/toPublicError";
import { publishActivity } from "@/lib/events/activityEvents";
import { logEvent } from "@/lib/log";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";
import { isRetryableFailure } from "@/lib/queue/retryPolicy";
import { getLlmSlots } from "@/lib/queue/slotPool";
import { TaskQuotaError } from "./errors";
import { getTaskRepository } from "./getTaskRepository";
import type { TaskHandler } from "./handler";
import { TASK_HANDLERS } from "./registry";
import type { NewTaskFile } from "./types";
import { createTaskWorker, type TaskWorker } from "./worker";

/** Finished tasks and notifications older than this are deleted when the server starts, then once a day. */
export const TASK_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Purging and backups run at boot and then this often. */
const MAINTENANCE_INTERVAL_MS = DAY_MS;

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
    isRetryable: (error) => isRetryableFailure(toPublicError(error)),
    describeError: (error) => toPublicError(error).message,
    notify: (notification) => getNotificationRepository().create(notification),
    sharedSlots: { llm: getLlmSlots() },
    onActivity: publishActivity,
  });
  return globalForWorker.magistralTaskWorker;
}

/** Deletes finished tasks (with any document text they still hold), old notifications and expired sessions. */
function purgeOldRecords(now: Date): void {
  try {
    const cutoff = new Date(now.getTime() - TASK_RETENTION_DAYS * DAY_MS);
    getTaskRepository().purgeFinishedBefore(cutoff);
    getNotificationRepository().purgeBefore(cutoff);
    getSessionRepository().purgeExpired(now);
  } catch (error) {
    logEvent("error", "maintenance.purge_failed", {}, error);
  }
}

/** Copies the database when MAGISTRAL_BACKUP_DIR is set (once a day; a restart the same day skips it). */
function backUpDatabase(now: Date): void {
  const dir = process.env[BACKUP_DIR_ENV_VAR]?.trim();
  if (!dir) return;
  try {
    const { written, removed } = backupDatabase(getDb(), path.resolve(/* turbopackIgnore: true */ process.cwd(), dir), now);
    if (written) logEvent("info", "maintenance.backup_written", { file: written, removed: removed.length });
  } catch (error) {
    logEvent("error", "maintenance.backup_failed", { dir }, error);
  }
}

function runDailyMaintenance(): void {
  const now = new Date();
  purgeOldRecords(now);
  backUpDatabase(now);
}

/** Whether this process's worker is running, for the health check. */
export function isTaskWorkerRunning(): boolean {
  return globalForWorker.magistralTaskWorkerStarted === true;
}

/** Starts the worker if it isn't running yet, purging old records now and daily; safe to call from every entry point. */
export function ensureTaskWorkerStarted(): TaskWorker {
  const worker = getTaskWorker();
  if (!globalForWorker.magistralTaskWorkerStarted) {
    runDailyMaintenance();
    setInterval(runDailyMaintenance, MAINTENANCE_INTERVAL_MS).unref();
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
  publishActivity(request.ownerId);
  return id;
}
