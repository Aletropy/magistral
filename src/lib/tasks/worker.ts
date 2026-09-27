import { runAsUser } from "@/lib/auth/actor";
import type { NewNotification, NotificationDraft } from "@/lib/notifications/types";
import { retryDelayMs } from "@/lib/queue/retryPolicy";
import { TaskCanceledError, TaskInputError } from "./errors";
import type { AnyTaskHandler, TaskContext } from "./handler";
import { INVALID_TASK_PAYLOAD_MESSAGE, UNKNOWN_TASK_KIND_MESSAGE } from "./messages";
import type { TaskRepository } from "./repository";
import { TASK_LANES, type ClaimedTask, type TaskLane } from "./types";

/** Two LLM calls at once (free models are slow; more would hit rate limits); library work is serialized. */
export const DEFAULT_LANE_CAPACITY: Record<TaskLane, number> = { llm: 2, library: 1 };
export const TASK_MAX_ATTEMPTS = 5;
export const TASK_POLL_INTERVAL_MS = 5_000;

export interface TaskWorkerOptions {
  tasks: TaskRepository;
  handlers: readonly AnyTaskHandler[];
  /** Transient failures (rate limits, overloaded upstream) are retried with backoff. */
  isRetryable: (error: unknown) => boolean;
  /** A pt-BR message safe to show the user. */
  describeError: (error: unknown) => string;
  notify: (notification: NewNotification) => void;
  laneCapacity?: Record<TaskLane, number>;
  maxAttempts?: number;
  pollIntervalMs?: number;
  now?: () => Date;
}

export interface TaskWorker {
  /** Requeues tasks a previous process left running, then keeps every lane busy until stopped. */
  start(): void;
  stop(): void;
  /** Checks the queue now instead of waiting for the next poll, e.g. right after a task is created. */
  wake(): void;
  /** Cancels a pending or running task; returns false when it had already finished. */
  cancel(id: string): boolean;
  /** Claims due tasks into every free slot and starts them; returns how many started. */
  fill(): number;
  /** Resolves once every task started so far has settled. */
  drain(): Promise<void>;
  /** `fill` then `drain`, for tests. */
  tick(): Promise<number>;
}

interface RunningTask {
  controller: AbortController;
  done: Promise<void>;
}

export function createTaskWorker(options: TaskWorkerOptions): TaskWorker {
  const {
    tasks,
    handlers,
    isRetryable,
    describeError,
    notify,
    laneCapacity = DEFAULT_LANE_CAPACITY,
    maxAttempts = TASK_MAX_ATTEMPTS,
    pollIntervalMs = TASK_POLL_INTERVAL_MS,
    now = () => new Date(),
  } = options;
  const handlersByKind = new Map(handlers.map((handler) => [handler.kind, handler]));
  const running = new Map<string, RunningTask>();
  const runningByLane = new Map<TaskLane, Set<string>>(TASK_LANES.map((lane) => [lane, new Set()]));
  let active = false;
  let wakeUp: (() => void) | null = null;

  function safeNotify(notification: NewNotification): void {
    try {
      notify(notification);
    } catch (error) {
      console.error("[tasks] failed to record a notification", error);
    }
  }

  function safely(cleanup: () => void): void {
    try {
      cleanup();
    } catch (error) {
      console.error("[tasks] cleanup hook failed", error);
    }
  }

  /** The task already counts as succeeded here, so a failure to describe it must not reach the failure path. */
  function notifySuccess(handler: AnyTaskHandler, result: unknown, task: ClaimedTask): void {
    let draft: NotificationDraft;
    try {
      draft = handler.describeSuccess(result, task);
    } catch (error) {
      console.error(`[tasks] ${task.kind} succeeded but its notification failed`, error);
      draft = { level: "success", title: `Concluída: ${task.title}`, body: "", href: null };
    }
    safeNotify({ ...draft, ownerId: task.ownerId, taskId: task.id });
  }

  function failPermanently(task: ClaimedTask, message: string, handler?: AnyTaskHandler, payload?: unknown): void {
    if (!tasks.fail(task.id, message, now())) return;
    if (handler && payload !== undefined) {
      const failure = handler.onFailed;
      if (failure) safely(() => failure(payload, message));
    }
    const draft = handler?.describeFailure(message, task, payload) ?? {
      level: "error" as const,
      title: `Falhou: ${task.title}`,
      body: message,
      href: null,
    };
    safeNotify({ ...draft, ownerId: task.ownerId, taskId: task.id });
  }

  async function execute(task: ClaimedTask, signal: AbortSignal): Promise<void> {
    const handler = handlersByKind.get(task.kind);
    if (!handler) return failPermanently(task, UNKNOWN_TASK_KIND_MESSAGE);
    const parsed = handler.payloadSchema.safeParse(task.payload);
    if (!parsed.success) return failPermanently(task, INVALID_TASK_PAYLOAD_MESSAGE, handler);
    const payload: unknown = parsed.data;

    let committed = false;
    const context: TaskContext<unknown> = {
      taskId: task.id,
      ownerId: task.ownerId,
      title: task.title,
      payload,
      signal,
      files: () => tasks.files(task.id),
      setFileOutcome: (position, outcome) => tasks.setFileOutcome(task.id, position, outcome),
      reportProgress: (current, total, label) => tasks.reportProgress(task.id, current, total, label),
      commit(write) {
        const result = tasks.complete(task.id, now(), write);
        committed = true;
        return result;
      },
    };

    try {
      // LLM calls made by the handler are attributed to the task's owner.
      const result: unknown = await runAsUser(task.ownerId, () => handler.run(context));
      if (!committed) tasks.complete(task.id, now(), () => result);
      notifySuccess(handler, result, task);
    } catch (error) {
      if (signal.aborted || error instanceof TaskCanceledError) {
        const cancellation = handler.onCanceled;
        if (cancellation) safely(() => cancellation(payload));
        return;
      }
      const message = error instanceof TaskInputError ? error.message : describeError(error);
      if (!(error instanceof TaskInputError) && isRetryable(error) && task.attempts < maxAttempts) {
        tasks.retry(task.id, message, new Date(now().getTime() + retryDelayMs(task.attempts)));
        return;
      }
      if (!(error instanceof TaskInputError)) console.error(`[tasks] ${task.kind} failed`, error);
      failPermanently(task, message, handler, payload);
    }
  }

  function launch(task: ClaimedTask): void {
    const controller = new AbortController();
    const lane = runningByLane.get(task.lane)!;
    lane.add(task.id);
    const done = execute(task, controller.signal)
      .catch((error: unknown) => console.error("[tasks] unexpected worker failure", error))
      .finally(() => {
        running.delete(task.id);
        lane.delete(task.id);
        // A slot is free: look for more work right away.
        wakeUp?.();
      });
    running.set(task.id, { controller, done });
  }

  function fill(): number {
    let started = 0;
    for (const lane of TASK_LANES) {
      const free = laneCapacity[lane] - runningByLane.get(lane)!.size;
      for (const task of tasks.claim(lane, free, now())) {
        launch(task);
        started++;
      }
    }
    return started;
  }

  async function drain(): Promise<void> {
    while (running.size > 0) await Promise.all([...running.values()].map((task) => task.done));
  }

  function idle(): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(done, pollIntervalMs);
      timer.unref?.();
      function done() {
        clearTimeout(timer);
        wakeUp = null;
        resolve();
      }
      wakeUp = done;
    });
  }

  async function loop(): Promise<void> {
    while (active) {
      try {
        fill();
      } catch (error) {
        console.error("[tasks] failed to claim tasks", error);
      }
      await idle();
    }
  }

  return {
    start() {
      if (active) return;
      active = true;
      tasks.resetRunning(maxAttempts, now());
      void loop();
    },
    stop() {
      active = false;
      wakeUp?.();
    },
    wake: () => wakeUp?.(),
    cancel(id) {
      const stored = tasks.getPayload(id);
      if (!stored || !tasks.cancel(id, now())) return false;
      const current = running.get(id);
      if (current) {
        // The run rejects with an abort error, and its catch runs the handler's cleanup.
        current.controller.abort();
        return true;
      }
      const handler = handlersByKind.get(stored.kind);
      const parsed = handler?.payloadSchema.safeParse(stored.payload);
      const cancellation = handler?.onCanceled;
      if (cancellation && parsed?.success) safely(() => cancellation(parsed.data));
      return true;
    },
    fill,
    drain,
    async tick() {
      const started = fill();
      await drain();
      return started;
    },
  };
}
