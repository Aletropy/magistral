import "server-only";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { readTaskParam } from "@/lib/tasks/readTaskParam";
import type { TaskDetail } from "@/lib/tasks/types";
import { loadDraftTaskState } from "./loadDraftTaskState";
import { DRAFT_SUGGESTION_QUERY_PARAM } from "./paths";

export type StudioState =
  | { kind: "finished"; minutaId: string }
  | { kind: "ready"; initialTask: TaskDetail | null; initialSuggestion: TaskDetail | null };

/**
 * What a minuta page was opened with: a draft task still running (`?tarefa=`), one already saved (the page
 * then opens its review), or a finished document reading to apply (`?rascunho=`).
 */
export function loadStudioState(params: Record<string, string | string[] | undefined>, ownerId: string): StudioState {
  const draft = loadDraftTaskState(readTaskParam(params), ownerId);
  if (draft.kind === "finished") return { kind: "finished", minutaId: draft.minutaId };
  const suggestionId = readTaskParam(params, DRAFT_SUGGESTION_QUERY_PARAM);
  const suggestion = suggestionId ? getTaskRepository().get(suggestionId, ownerId) : null;
  return {
    kind: "ready",
    initialTask: draft.kind === "following" ? draft.task : null,
    initialSuggestion: suggestion?.kind === "minuta.extract" ? suggestion : null,
  };
}
