import type { z } from "zod";
import type { NotificationDraft } from "@/lib/notifications/types";
import type { TaskFile, TaskKind, TaskLane } from "./types";

/** What a handler gets while it runs. */
export interface TaskContext<P> {
  taskId: string;
  title: string;
  payload: P;
  /** Aborted when the user cancels the task; pass it to LLM and embedding calls. */
  signal: AbortSignal;
  /** Files uploaded with the task (read on demand; they can be large). */
  files(): TaskFile[];
  /** Remembers what happened to one file, so a resumed task skips it. */
  setFileOutcome(position: number, outcome: string): void;
  reportProgress(current: number, total: number | null, label: string | null): void;
  /**
   * Runs `write` in the transaction that marks the task as succeeded, and returns its value as the result.
   * Use it for side effects that must not happen once the task was cancelled.
   */
  commit<R>(write: () => R): R;
}

/** One kind of background work: how to run it and what to tell the user when it ends. */
export interface TaskHandler<P, R> {
  kind: TaskKind;
  lane: TaskLane;
  payloadSchema: z.ZodType<P>;
  resultSchema: z.ZodType<R>;
  run(context: TaskContext<P>): Promise<R>;
  describeSuccess(result: R, task: { id: string; title: string }): NotificationDraft;
  describeFailure(message: string, task: { id: string; title: string }): NotificationDraft;
  /** Cleans up after a permanent failure (e.g. marks a pending chat reply as failed). */
  onFailed?(payload: P, message: string): void;
  /** Cleans up after the user cancelled the task. */
  onCanceled?(payload: P): void;
}

/** Handlers of any payload and result, as kept in the registry. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTaskHandler = TaskHandler<any, any>;
