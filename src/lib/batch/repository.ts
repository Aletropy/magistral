import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { withTransaction } from "@/lib/db/transaction";
import { minutaRequestSchema, type MinutaRequest } from "@/lib/minuta/schema";
import {
  BATCH_ITEM_STATUSES,
  type BatchItemStatus,
  type BatchJobDetail,
  type BatchJobSummary,
  type ClaimedBatchItem,
  type FinishedBatchItem,
} from "./types";

const jsonOf = <T extends z.ZodType>(schema: T) =>
  z
    .string()
    .transform((json) => JSON.parse(json) as unknown)
    .pipe(schema);

const templateJson = jsonOf(minutaRequestSchema);
const rowJson = jsonOf(z.record(z.string(), z.string()));

const jobRowSchema = z.object({
  id: z.string(),
  owner_id: z.string().nullable(),
  name: z.string(),
  created_at: z.string(),
  request_template: z.string(),
  total: z.number(),
  pending: z.number(),
  running: z.number(),
  done: z.number(),
  failed: z.number(),
});

const itemRowSchema = z.object({
  id: z.number(),
  position: z.number(),
  label: z.string(),
  status: z.enum(BATCH_ITEM_STATUSES),
  error: z.string().nullable(),
  attempts: z.number(),
});

const claimedRowSchema = z.object({
  id: z.number(),
  job_id: z.string(),
  position: z.number(),
  row_data: rowJson,
  attempts: z.number(),
});

const finishedRowSchema = z.object({ position: z.number(), label: z.string(), markdown: z.string() });

export interface NewBatchRow {
  label: string;
  row: Record<string, string>;
}

/** Jobs are private to their owner: reads and deletes take the owner, and another user's id reads as missing. */
export interface BatchRepository {
  createJob(ownerId: string, name: string, template: MinutaRequest, rows: NewBatchRow[]): string;
  listJobs(ownerId: string): BatchJobSummary[];
  /** How many of the owner's jobs still have pending or running items. */
  countActiveJobs(ownerId: string): number;
  getJob(id: string, ownerId: string): BatchJobDetail | null;
  deleteJob(id: string, ownerId: string): boolean;
  /** Atomically marks up to `limit` due pending items as running and returns them, oldest job first. */
  claimItems(limit: number, now: Date): ClaimedBatchItem[];
  completeItem(id: number, markdown: string): void;
  failItem(id: number, error: string): void;
  /** Puts an item back in the queue after a transient failure, not before `retryAt`. */
  retryItem(id: number, error: string, retryAt: Date): void;
  /** Puts a job's failed items back in the queue with fresh attempts; returns how many. */
  retryFailedItems(jobId: string, now: Date): number;
  /**
   * Requeues items left running by a previous process and fails those with no attempts left (an item
   * that crashes the process must not loop forever); returns how many were touched.
   */
  resetRunningItems(maxAttempts: number, interruptedMessage: string): number;
  /**
   * Marks the job as finished when nothing is pending or running, returning its summary only the first
   * time, so concurrent items finishing together notify once. A retry of failed items resets the mark.
   */
  markFinishedIfDone(jobId: string, now: Date): BatchJobSummary | null;
  finishedItems(jobId: string): FinishedBatchItem[];
}

const JOB_COLUMNS = `
  j.id, j.owner_id, j.name, j.created_at, j.request_template,
  COUNT(i.id) AS total,
  COALESCE(SUM(i.status = 'pending'), 0) AS pending,
  COALESCE(SUM(i.status = 'running'), 0) AS running,
  COALESCE(SUM(i.status = 'done'), 0) AS done,
  COALESCE(SUM(i.status = 'failed'), 0) AS failed`;

function toSummary(row: unknown): BatchJobSummary {
  const parsed = jobRowSchema.parse(row);
  const counts: Record<BatchItemStatus, number> = {
    pending: parsed.pending,
    running: parsed.running,
    done: parsed.done,
    failed: parsed.failed,
  };
  return {
    id: parsed.id,
    ownerId: parsed.owner_id,
    name: parsed.name,
    createdAt: parsed.created_at,
    total: parsed.total,
    counts,
  };
}

function templateOf(row: unknown): MinutaRequest {
  return templateJson.parse(jobRowSchema.parse(row).request_template);
}

export function createBatchRepository(db: DatabaseSync): BatchRepository {
  const insertJob = db.prepare("INSERT INTO batch_jobs (id, owner_id, name, request_template) VALUES (?, ?, ?, ?)");
  const insertItem = db.prepare("INSERT INTO batch_items (job_id, position, label, row_data) VALUES (?, ?, ?, ?)");
  const selectJobs = db.prepare(
    `SELECT ${JOB_COLUMNS} FROM batch_jobs j LEFT JOIN batch_items i ON i.job_id = j.id
     WHERE j.owner_id = ? GROUP BY j.id ORDER BY j.created_at DESC`,
  );
  const selectJob = db.prepare(
    `SELECT ${JOB_COLUMNS} FROM batch_jobs j LEFT JOIN batch_items i ON i.job_id = j.id WHERE j.id = ? GROUP BY j.id`,
  );
  const selectOwnedJob = db.prepare(
    `SELECT ${JOB_COLUMNS} FROM batch_jobs j LEFT JOIN batch_items i ON i.job_id = j.id
     WHERE j.id = ? AND j.owner_id = ? GROUP BY j.id`,
  );
  const selectItems = db.prepare(
    "SELECT id, position, label, status, error, attempts FROM batch_items WHERE job_id = ? ORDER BY position",
  );
  const deleteJobById = db.prepare("DELETE FROM batch_jobs WHERE id = ? AND owner_id = ?");
  const claim = db.prepare(
    `UPDATE batch_items SET status = 'running', attempts = attempts + 1
     WHERE id IN (
       SELECT i.id FROM batch_items i JOIN batch_jobs j ON j.id = i.job_id
       WHERE i.status = 'pending' AND i.next_attempt_at <= ?
       ORDER BY j.created_at, i.position LIMIT ?
     )
     RETURNING id, job_id, position, row_data, attempts`,
  );
  const countActive = db.prepare(
    `SELECT COUNT(DISTINCT i.job_id) AS count FROM batch_items i JOIN batch_jobs j ON j.id = i.job_id
     WHERE j.owner_id = ? AND i.status IN ('pending', 'running')`,
  );
  const selectTemplate = db.prepare("SELECT owner_id, request_template FROM batch_jobs WHERE id = ?");
  const complete = db.prepare(
    "UPDATE batch_items SET status = 'done', markdown = ?, error = NULL WHERE id = ? AND status = 'running'",
  );
  const fail = db.prepare("UPDATE batch_items SET status = 'failed', error = ? WHERE id = ? AND status = 'running'");
  const retry = db.prepare(
    "UPDATE batch_items SET status = 'pending', error = ?, next_attempt_at = ? WHERE id = ? AND status = 'running'",
  );
  const retryFailed = db.prepare(
    `UPDATE batch_items SET status = 'pending', attempts = 0, error = NULL, next_attempt_at = ?
     WHERE job_id = ? AND status = 'failed'`,
  );
  const clearFinished = db.prepare("UPDATE batch_jobs SET notified_at = NULL WHERE id = ?");
  const markFinished = db.prepare(
    `UPDATE batch_jobs SET notified_at = ?
     WHERE id = ? AND notified_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM batch_items WHERE job_id = ? AND status IN ('pending', 'running'))
     RETURNING id`,
  );
  const failExhausted = db.prepare(
    "UPDATE batch_items SET status = 'failed', error = ? WHERE status = 'running' AND attempts >= ?",
  );
  const resetRunning = db.prepare("UPDATE batch_items SET status = 'pending' WHERE status = 'running'");
  const selectFinished = db.prepare(
    "SELECT position, label, markdown FROM batch_items WHERE job_id = ? AND status = 'done' ORDER BY position",
  );

  return {
    createJob(ownerId, name, template, rows) {
      const id = randomUUID();
      withTransaction(db, () => {
        insertJob.run(id, ownerId, name, JSON.stringify(template));
        rows.forEach(({ label, row }, index) => insertItem.run(id, index + 1, label, JSON.stringify(row)));
      });
      return id;
    },

    listJobs: (ownerId) => selectJobs.all(ownerId).map(toSummary),
    countActiveJobs: (ownerId) => z.object({ count: z.number() }).parse(countActive.get(ownerId)).count,

    getJob(id, ownerId) {
      const row = selectOwnedJob.get(id, ownerId);
      if (!row) return null;
      return {
        ...toSummary(row),
        template: templateOf(row),
        items: selectItems.all(id).map((item) => itemRowSchema.parse(item)),
      };
    },

    deleteJob: (id, ownerId) => deleteJobById.run(id, ownerId).changes > 0,

    claimItems(limit, now) {
      return withTransaction(db, () =>
        claim.all(now.toISOString(), limit).map((row) => {
          const parsed = claimedRowSchema.parse(row);
          const job = z
            .object({ owner_id: z.string().nullable(), request_template: z.string() })
            .parse(selectTemplate.get(parsed.job_id));
          return {
            id: parsed.id,
            jobId: parsed.job_id,
            ownerId: job.owner_id,
            position: parsed.position,
            template: templateJson.parse(job.request_template),
            row: parsed.row_data,
            attempts: parsed.attempts,
          };
        }),
      ).sort((a, b) => a.position - b.position);
    },

    completeItem: (id, markdown) => void complete.run(markdown, id),
    failItem: (id, error) => void fail.run(error, id),
    retryItem: (id, error, retryAt) => void retry.run(error, retryAt.toISOString(), id),
    retryFailedItems(jobId, now) {
      return withTransaction(db, () => {
        const requeued = Number(retryFailed.run(now.toISOString(), jobId).changes);
        if (requeued > 0) clearFinished.run(jobId);
        return requeued;
      });
    },
    resetRunningItems(maxAttempts, interruptedMessage) {
      return withTransaction(db, () => {
        const failed = Number(failExhausted.run(interruptedMessage, maxAttempts).changes);
        return failed + Number(resetRunning.run().changes);
      });
    },
    markFinishedIfDone(jobId, now) {
      if (!markFinished.get(now.toISOString(), jobId, jobId)) return null;
      const row = selectJob.get(jobId);
      return row ? toSummary(row) : null;
    },
    finishedItems: (jobId) => selectFinished.all(jobId).map((row) => finishedRowSchema.parse(row)),
  };
}
