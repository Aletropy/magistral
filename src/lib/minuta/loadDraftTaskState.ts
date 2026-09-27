import "server-only";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import type { TaskDetail } from "@/lib/tasks/types";
import { draftTaskResultSchema } from "./draftTaskResult";

export type DraftTaskState = { kind: "none" } | { kind: "following"; task: TaskDetail } | { kind: "finished"; minutaId: string };

/** The draft task a page was opened with (`?tarefa=`): still to follow, or already saved as a minuta. */
export function loadDraftTaskState(taskId: string | null, ownerId: string): DraftTaskState {
  const task = taskId ? getTaskRepository().get(taskId, ownerId) : null;
  if (!task || task.kind !== "minuta.draft") return { kind: "none" };
  const finished = task.status === "succeeded" ? draftTaskResultSchema.safeParse(task.result) : null;
  return finished?.success ? { kind: "finished", minutaId: finished.data.minutaId } : { kind: "following", task };
}
