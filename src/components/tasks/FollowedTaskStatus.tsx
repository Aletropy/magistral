"use client";

import type { BackgroundTask } from "@/hooks/useBackgroundTask";
import { TaskStatusCard } from "./TaskStatusCard";

/** The status card for a task a component started, or nothing when it isn't following one. */
export function FollowedTaskStatus({ background, runningTitle }: { background: BackgroundTask<unknown>; runningTitle: string }) {
  const { taskId, task, taskState } = background;
  if (!taskId) return null;
  return (
    <TaskStatusCard
      task={task}
      runningTitle={runningTitle}
      isStale={taskState.isStale}
      actionError={taskState.actionError}
      onCancel={() => void taskState.cancel()}
      onRetry={() => void taskState.retry()}
    />
  );
}
