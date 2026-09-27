"use client";

import { useCallback } from "react";
import { postJson } from "@/lib/http/client";
import { MINUTA_ENDPOINT } from "@/lib/http/endpoints";
import { draftTaskResultSchema } from "@/lib/minuta/draftTaskResult";
import type { MinutaRequest } from "@/lib/minuta/schema";
import type { TaskDetail } from "@/lib/tasks/types";
import { useBackgroundTask } from "./useBackgroundTask";

const GENERATION_FAILED = "Não foi possível gerar a minuta. Tente novamente.";

/**
 * Queues a minuta draft as a background task and follows it; the task id goes into the URL, so leaving
 * the page never loses the work. `minutaId` is set once the minuta is saved in the history.
 */
export function useMinutaGeneration(initialTask: TaskDetail | null = null) {
  const background = useBackgroundTask(draftTaskResultSchema, initialTask);
  const { start } = background;

  const generate = useCallback(
    (request: MinutaRequest) => start(() => postJson(MINUTA_ENDPOINT, request), GENERATION_FAILED),
    [start],
  );

  return { background, generate, minutaId: background.result?.minutaId ?? null };
}
