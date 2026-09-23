"use client";

import { useCallback, useState } from "react";
import type { z } from "zod";
import { useActivity } from "@/components/activity/ActivityProvider";
import { replaceTaskParam } from "@/lib/browser/taskQueryParam";
import { NETWORK_ERROR_MESSAGE, readErrorMessage, type TaskCreatedResponseBody } from "@/lib/http/api";
import type { TaskDetail } from "@/lib/tasks/types";
import { useTask } from "./useTask";

/**
 * Starts a slow action through an endpoint that answers 202 with a task id, then follows that task.
 * The id goes into the page URL (`?tarefa=`), so coming back from a notification restores the result.
 */
export function useBackgroundTask<R>(resultSchema: z.ZodType<R>, initial: TaskDetail | null = null) {
  const { refresh: refreshActivity } = useActivity();
  const [taskId, setTaskId] = useState(initial?.id ?? null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const taskState = useTask(taskId, initial);
  const finished = taskState.task?.status === "succeeded" ? resultSchema.safeParse(taskState.task.result) : null;

  /** Sends the request; resolves to whether a task was queued (errors are kept in `startError`). */
  const start = useCallback(
    async (request: () => Promise<Response>, failureMessage: string) => {
      setIsStarting(true);
      setStartError(null);
      try {
        const response = await request();
        if (!response.ok) {
          setStartError(await readErrorMessage(response, failureMessage));
          return false;
        }
        const { taskId: queued } = (await response.json()) as TaskCreatedResponseBody;
        setTaskId(queued);
        replaceTaskParam(queued);
        refreshActivity();
        return true;
      } catch {
        setStartError(NETWORK_ERROR_MESSAGE);
        return false;
      } finally {
        setIsStarting(false);
      }
    },
    [refreshActivity],
  );

  /** Stops following the task (it keeps its entry in /tarefas). */
  const dismiss = useCallback(() => {
    setTaskId(null);
    replaceTaskParam(null);
  }, []);

  return {
    taskId,
    task: taskState.task,
    taskState,
    /** The parsed result once the task succeeded. */
    result: finished?.success ? finished.data : null,
    isStarting,
    /** Starting or running: the action's button should wait. */
    isBusy: isStarting || taskState.isActive,
    startError,
    start,
    dismiss,
  };
}

export type BackgroundTask<R> = ReturnType<typeof useBackgroundTask<R>>;
