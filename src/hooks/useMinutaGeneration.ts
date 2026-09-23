"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MINUTA_ENDPOINT,
  minutaEndpoint,
  postJson,
  type MinutaResponseBody,
} from "@/lib/http/api";
import { draftTaskResultSchema } from "@/lib/minuta/draftTaskResult";
import type { MinutaRequest } from "@/lib/minuta/schema";
import type { TaskDetail } from "@/lib/tasks/types";
import { useBackgroundTask } from "./useBackgroundTask";

const GENERATION_FAILED = "Não foi possível gerar a minuta. Tente novamente.";
const LOAD_FAILED = "A minuta ficou pronta, mas não foi possível abri-la. Veja no histórico.";

export interface MinutaGenerationInitialState {
  /** A draft task the page was opened with (`?tarefa=`), so it survives a refresh or a trip elsewhere. */
  task: TaskDetail | null;
  /** The finished minuta, when the server already had it. */
  result: MinutaResponseBody | null;
}

export const NO_GENERATION: MinutaGenerationInitialState = { task: null, result: null };

/**
 * Queues a minuta draft as a background task, follows it and loads the saved minuta once it is ready.
 * The task id goes into the URL, so leaving the page never loses the work.
 */
export function useMinutaGeneration(initial: MinutaGenerationInitialState = NO_GENERATION) {
  const background = useBackgroundTask(draftTaskResultSchema, initial.task);
  const [loaded, setLoaded] = useState(initial.result);
  const [loadError, setLoadError] = useState<string | null>(null);
  const minutaId = background.result?.minutaId ?? null;
  // A result for an older task stays hidden once a new draft starts.
  const result = loaded && loaded.id === minutaId ? loaded : null;
  const isLoadingResult = minutaId !== null && result === null && loadError === null;

  useEffect(() => {
    if (!minutaId || loaded?.id === minutaId) return;
    let ignore = false;
    fetch(minutaEndpoint(minutaId), { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as MinutaResponseBody;
        if (!ignore) setLoaded(body);
      })
      .catch(() => {
        if (!ignore) setLoadError(LOAD_FAILED);
      });
    return () => {
      ignore = true;
    };
  }, [minutaId, loaded?.id]);

  const { start } = background;
  const generate = useCallback(
    (request: MinutaRequest) => {
      setLoadError(null);
      return start(() => postJson(MINUTA_ENDPOINT, request), GENERATION_FAILED);
    },
    [start],
  );

  /** Swaps in a reviewed version of the Markdown; the other response fields stay as generated. */
  const replaceMarkdown = useCallback((markdown: string) => {
    setLoaded((previous) => (previous ? { ...previous, markdown } : previous));
  }, []);

  return {
    background,
    result,
    /** Submitting, drafting or loading the finished minuta. */
    isWorking: background.isBusy || isLoadingResult,
    /** A draft is queued, running, failed or cancelled: the page shows its status instead of a result. */
    showTaskStatus: background.taskId !== null && background.task?.status !== "succeeded",
    isLoadingResult,
    error: background.startError ?? loadError,
    generate,
    replaceMarkdown,
  };
}
