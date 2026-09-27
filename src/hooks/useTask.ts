"use client";

import { useCallback, useEffect, useState } from "react";
import { useActivity } from "@/components/activity/ActivityProvider";
import {
  HTTP_NOT_FOUND,
  NETWORK_ERROR_MESSAGE,
  readErrorMessage,
  taskCancelEndpoint,
  taskEndpoint,
  taskRetryEndpoint,
  type TaskResponseBody,
} from "@/lib/http/api";
import { isTaskActive, type TaskDetail } from "@/lib/tasks/types";

/** How often a task the page is waiting on is refreshed. */
export const TASK_POLL_INTERVAL_MS = 2000;

const ACTION_FAILED = "Não foi possível atualizar a tarefa. Tente novamente.";

interface TaskState {
  id: string | null;
  task: TaskDetail | null;
  /** The server no longer has the task (purged after the retention period, or not this user's). */
  missing: boolean;
}

/**
 * Follows one background task: polls it while it is queued or running and stops once it finishes.
 * `initial` is the task as the server page read it, so a restored page renders without a flash.
 */
export function useTask(taskId: string | null, initial: TaskDetail | null = null) {
  const { refresh: refreshActivity } = useActivity();
  const [state, setState] = useState<TaskState>({ id: taskId, task: initial, missing: false });
  const [isStale, setIsStale] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const task = state.id === taskId ? state.task : null;
  const isMissing = state.id === taskId && state.missing;
  const active = taskId !== null && !isMissing && (task === null || isTaskActive(task.status));

  const refresh = useCallback(async () => {
    if (!taskId) return;
    try {
      const response = await fetch(taskEndpoint(taskId), { cache: "no-store" });
      if (response.status === HTTP_NOT_FOUND) {
        // Nothing left to follow: stop polling instead of asking again every interval.
        setState({ id: taskId, task: null, missing: true });
        setIsStale(false);
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      const { task: latest } = (await response.json()) as TaskResponseBody;
      setState({ id: taskId, task: latest, missing: false });
      setIsStale(false);
      // Its notification exists now: fetch it at once instead of on the next idle poll.
      if (!isTaskActive(latest.status)) refreshActivity();
    } catch {
      setIsStale(true);
    }
  }, [taskId, refreshActivity]);

  useEffect(() => {
    if (!active) return;
    // First check right away (a just-queued task has no state yet), then on every interval.
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), TASK_POLL_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active, refresh]);

  const act = useCallback(
    async (endpoint: (id: string) => string) => {
      if (!taskId) return;
      setActionError(null);
      try {
        const response = await fetch(endpoint(taskId), { method: "POST" });
        if (!response.ok) {
          setActionError(await readErrorMessage(response, ACTION_FAILED));
          return;
        }
        setState({ id: taskId, task: ((await response.json()) as TaskResponseBody).task, missing: false });
        refreshActivity();
      } catch {
        setActionError(NETWORK_ERROR_MESSAGE);
      }
    },
    [taskId, refreshActivity],
  );

  const cancel = useCallback(() => act(taskCancelEndpoint), [act]);
  const retry = useCallback(() => act(taskRetryEndpoint), [act]);

  return { task, isActive: active, isMissing, isStale, actionError, cancel, retry, refresh };
}
