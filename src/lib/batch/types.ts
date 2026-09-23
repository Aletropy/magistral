import type { MinutaRequest } from "@/lib/minuta/schema";

export const BATCH_ITEM_STATUSES = ["pending", "running", "done", "failed"] as const;
export type BatchItemStatus = (typeof BATCH_ITEM_STATUSES)[number];

export const BATCH_ITEM_STATUS_LABELS: Record<BatchItemStatus, string> = {
  pending: "Na fila",
  running: "Gerando",
  done: "Pronta",
  failed: "Falhou",
};

export interface BatchJobSummary {
  id: string;
  name: string;
  createdAt: string;
  total: number;
  counts: Record<BatchItemStatus, number>;
}

export interface BatchItemSummary {
  id: number;
  position: number;
  label: string;
  status: BatchItemStatus;
  /** Last error; kept on a pending item that is waiting to be retried. */
  error: string | null;
  attempts: number;
}

export interface BatchJobDetail extends BatchJobSummary {
  template: MinutaRequest;
  items: BatchItemSummary[];
}

/** An item the worker has claimed, with everything needed to draft it. */
export interface ClaimedBatchItem {
  id: number;
  jobId: string;
  position: number;
  template: MinutaRequest;
  row: Record<string, string>;
  /** Including the current attempt. */
  attempts: number;
}

export interface FinishedBatchItem {
  position: number;
  label: string;
  markdown: string;
}

/** Whether a job still has work to do. */
export function isJobActive(summary: Pick<BatchJobSummary, "counts">): boolean {
  return summary.counts.pending + summary.counts.running > 0;
}
