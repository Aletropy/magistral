import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { withTransaction } from "@/lib/db/transaction";
import { TaskCanceledError } from "./errors";
import {
  TASK_KINDS,
  TASK_LANES,
  TASK_STATUSES,
  type ClaimedTask,
  type NewTask,
  type TaskDetail,
  type TaskFile,
  type TaskKind,
  type TaskLane,
  type TaskSummary,
} from "./types";

/** Recorded on a task that was running when the server stopped and had no attempts left. */
export const INTERRUPTED_TASK_MESSAGE = "A tarefa foi interrompida porque o servidor reiniciou.";

const summaryRowSchema = z.object({
  id: z.string(),
  kind: z.enum(TASK_KINDS),
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  error: z.string().nullable(),
  attempts: z.number(),
  progress_current: z.number().nullable(),
  progress_total: z.number().nullable(),
  progress_label: z.string().nullable(),
  href: z.string().nullable(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
});

const detailRowSchema = summaryRowSchema.extend({ result: z.string().nullable() });

const claimedRowSchema = z.object({
  id: z.string(),
  owner_id: z.string().nullable(),
  kind: z.enum(TASK_KINDS),
  lane: z.enum(TASK_LANES),
  title: z.string(),
  payload: z.string(),
  attempts: z.number(),
  created_at: z.string(),
});

const fileRowSchema = z.object({
  position: z.number(),
  name: z.string(),
  bytes: z.instanceof(Uint8Array),
  outcome: z.string().nullable(),
});

const statusRowSchema = z.object({ status: z.enum(TASK_STATUSES) });

export interface TaskListOptions {
  ownerId: string;
  /** Only pending and running tasks. */
  activeOnly?: boolean;
  limit: number;
}

export interface TaskRepository {
  create(task: NewTask): string;
  /** Atomically marks up to `limit` due pending tasks of a lane as running and returns them, oldest first. */
  claim(lane: TaskLane, limit: number, now: Date): ClaimedTask[];
  files(taskId: string): TaskFile[];
  setFileOutcome(taskId: string, position: number, outcome: string): void;
  reportProgress(id: string, current: number, total: number | null, label: string | null): void;
  /**
   * Marks a running task as succeeded with the value `produce` returns, running it in the same transaction
   * so side effects (saving a minuta, a chat reply) happen only if the task still counts. Throws
   * TaskCanceledError, without calling `produce`, when the task was cancelled in the meantime. The payload
   * (which may hold document text) is erased: a succeeded task is never run again.
   */
  complete<R>(id: string, now: Date, produce: () => R): R;
  fail(id: string, error: string, now: Date): boolean;
  /** Puts a running task back in the queue after a transient failure, not before `retryAt`. */
  retry(id: string, error: string, retryAt: Date): boolean;
  /** Cancels a pending or running task; the worker aborts it if it is running. */
  cancel(id: string, now: Date): boolean;
  /** Queues a failed or cancelled task again with fresh attempts. */
  requeue(id: string, now: Date): boolean;
  /** Requeues tasks left running by a previous process, failing those with no attempts left. */
  resetRunning(maxAttempts: number, now: Date): number;
  /** A task of this owner; another user's id reads as missing. */
  get(id: string, ownerId: string): TaskDetail | null;
  /** The task's kind and stored payload, for cleanup hooks. */
  getPayload(id: string): { kind: TaskKind; payload: unknown } | null;
  list(options: TaskListOptions): TaskSummary[];
  /** Queued and running tasks of one owner in a lane, to cap how much one person can queue. */
  countActive(ownerId: string, lane: TaskLane): number;
  /** Deletes finished tasks (and their files) older than `before`; returns how many. */
  purgeFinishedBefore(before: Date): number;
}

/** The href of the newest notification about the task: where its result can be seen. */
const TASK_COLUMNS = `
  t.id, t.kind, t.title, t.status, t.error, t.attempts,
  t.progress_current, t.progress_total, t.progress_label,
  (SELECT n.href FROM notifications n WHERE n.task_id = t.id ORDER BY n.id DESC LIMIT 1) AS href,
  t.created_at, t.started_at, t.finished_at`;

function toSummary(row: unknown): TaskSummary {
  const parsed = summaryRowSchema.parse(row);
  return {
    id: parsed.id,
    kind: parsed.kind,
    title: parsed.title,
    status: parsed.status,
    error: parsed.error,
    attempts: parsed.attempts,
    progress:
      parsed.progress_current === null
        ? null
        : { current: parsed.progress_current, total: parsed.progress_total, label: parsed.progress_label },
    href: parsed.href,
    createdAt: parsed.created_at,
    startedAt: parsed.started_at,
    finishedAt: parsed.finished_at,
  };
}

export function createTaskRepository(db: DatabaseSync): TaskRepository {
  const insertTask = db.prepare(
    "INSERT INTO tasks (id, owner_id, kind, lane, title, payload) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertFile = db.prepare("INSERT INTO task_files (task_id, position, name, bytes) VALUES (?, ?, ?, ?)");
  const claimDue = db.prepare(
    `UPDATE tasks SET status = 'running', attempts = attempts + 1, started_at = COALESCE(started_at, ?)
     WHERE id IN (
       SELECT id FROM tasks WHERE lane = ? AND status = 'pending' AND next_attempt_at <= ?
       ORDER BY created_at LIMIT ?
     )
     RETURNING id, owner_id, kind, lane, title, payload, attempts, created_at`,
  );
  const selectFiles = db.prepare(
    "SELECT position, name, bytes, outcome FROM task_files WHERE task_id = ? ORDER BY position",
  );
  const updateFileOutcome = db.prepare("UPDATE task_files SET outcome = ? WHERE task_id = ? AND position = ?");
  const deleteFiles = db.prepare("DELETE FROM task_files WHERE task_id = ?");
  const updateProgress = db.prepare(
    `UPDATE tasks SET progress_current = ?, progress_total = ?, progress_label = ?
     WHERE id = ? AND status = 'running'`,
  );
  const selectStatus = db.prepare("SELECT status FROM tasks WHERE id = ?");
  const succeed = db.prepare(
    `UPDATE tasks SET status = 'succeeded', result = ?, payload = '{}', error = NULL, finished_at = ?,
       progress_current = NULL, progress_total = NULL, progress_label = NULL
     WHERE id = ? AND status = 'running'`,
  );
  const failRunning = db.prepare(
    "UPDATE tasks SET status = 'failed', error = ?, finished_at = ? WHERE id = ? AND status = 'running'",
  );
  const retryRunning = db.prepare(
    `UPDATE tasks SET status = 'pending', error = ?, next_attempt_at = ?,
       progress_current = NULL, progress_total = NULL, progress_label = NULL
     WHERE id = ? AND status = 'running'`,
  );
  const cancelActive = db.prepare(
    `UPDATE tasks SET status = 'canceled', finished_at = ?
     WHERE id = ? AND status IN ('pending', 'running')`,
  );
  const requeueFinished = db.prepare(
    `UPDATE tasks SET status = 'pending', attempts = 0, error = NULL, result = NULL, next_attempt_at = ?,
       started_at = NULL, finished_at = NULL, progress_current = NULL, progress_total = NULL, progress_label = NULL
     WHERE id = ? AND status IN ('failed', 'canceled')`,
  );
  const requeueRunning = db.prepare(
    `UPDATE tasks SET status = 'pending', progress_current = NULL, progress_total = NULL, progress_label = NULL
     WHERE status = 'running' AND attempts < ?`,
  );
  const failExhausted = db.prepare(
    "UPDATE tasks SET status = 'failed', error = ?, finished_at = ? WHERE status = 'running' AND attempts >= ?",
  );
  const selectDetail = db.prepare(`SELECT ${TASK_COLUMNS}, t.result FROM tasks t WHERE t.id = ? AND t.owner_id = ?`);
  const selectPayload = db.prepare("SELECT kind, payload FROM tasks WHERE id = ?");
  const selectRecent = db.prepare(
    `SELECT ${TASK_COLUMNS} FROM tasks t WHERE t.owner_id = ? ORDER BY t.created_at DESC LIMIT ?`,
  );
  const selectActive = db.prepare(
    `SELECT ${TASK_COLUMNS} FROM tasks t
     WHERE t.owner_id = ? AND t.status IN ('pending', 'running') ORDER BY t.created_at LIMIT ?`,
  );
  const countActiveTasks = db.prepare(
    "SELECT COUNT(*) AS count FROM tasks WHERE owner_id = ? AND lane = ? AND status IN ('pending', 'running')",
  );
  const purgeFinished = db.prepare(
    "DELETE FROM tasks WHERE status IN ('succeeded', 'failed', 'canceled') AND finished_at < ?",
  );

  return {
    create({ ownerId, kind, lane, title, payload, files = [] }) {
      const id = randomUUID();
      withTransaction(db, () => {
        insertTask.run(id, ownerId, kind, lane, title, JSON.stringify(payload));
        files.forEach((file, index) => insertFile.run(id, index + 1, file.name, file.bytes));
      });
      return id;
    },

    claim(lane, limit, now) {
      if (limit <= 0) return [];
      const at = now.toISOString();
      return withTransaction(db, () => claimDue.all(at, lane, at, limit))
        .map((row) => claimedRowSchema.parse(row))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(({ id, owner_id, kind, lane: taskLane, title, payload, attempts }) => ({
          id,
          ownerId: owner_id,
          kind,
          lane: taskLane,
          title,
          payload: JSON.parse(payload) as unknown,
          attempts,
        }));
    },

    files: (taskId) => selectFiles.all(taskId).map((row) => fileRowSchema.parse(row)),
    setFileOutcome: (taskId, position, outcome) => void updateFileOutcome.run(outcome, taskId, position),
    reportProgress: (id, current, total, label) => void updateProgress.run(current, total, label, id),

    complete(id, now, produce) {
      return withTransaction(db, () => {
        const row = selectStatus.get(id);
        if (!row || statusRowSchema.parse(row).status !== "running") throw new TaskCanceledError();
        const result = produce();
        succeed.run(JSON.stringify(result ?? null), now.toISOString(), id);
        deleteFiles.run(id);
        return result;
      });
    },

    fail: (id, error, now) => failRunning.run(error, now.toISOString(), id).changes > 0,
    retry: (id, error, retryAt) => retryRunning.run(error, retryAt.toISOString(), id).changes > 0,

    cancel(id, now) {
      return withTransaction(db, () => {
        const canceled = cancelActive.run(now.toISOString(), id).changes > 0;
        if (canceled) deleteFiles.run(id);
        return canceled;
      });
    },

    requeue: (id, now) => requeueFinished.run(now.toISOString(), id).changes > 0,

    resetRunning(maxAttempts, now) {
      return withTransaction(db, () => {
        const failed = Number(failExhausted.run(INTERRUPTED_TASK_MESSAGE, now.toISOString(), maxAttempts).changes);
        return failed + Number(requeueRunning.run(maxAttempts).changes);
      });
    },

    get(id, ownerId) {
      const row = selectDetail.get(id, ownerId);
      if (!row) return null;
      const { result } = detailRowSchema.parse(row);
      return { ...toSummary(row), result: result === null ? null : (JSON.parse(result) as unknown) };
    },

    getPayload(id) {
      const row = selectPayload.get(id);
      if (!row) return null;
      const { kind, payload } = z.object({ kind: z.enum(TASK_KINDS), payload: z.string() }).parse(row);
      return { kind, payload: JSON.parse(payload) as unknown };
    },

    list: ({ ownerId, activeOnly = false, limit }) =>
      (activeOnly ? selectActive : selectRecent).all(ownerId, limit).map(toSummary),
    countActive: (ownerId, lane) => z.object({ count: z.number() }).parse(countActiveTasks.get(ownerId, lane)).count,
    purgeFinishedBefore: (before) => Number(purgeFinished.run(before.toISOString()).changes),
  };
}
