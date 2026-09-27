"use client";

import { useCallback } from "react";
import { STYLE_CAPTURE_ENDPOINT, UPLOAD_FILE_FIELD } from "@/lib/http/endpoints";
import { styleCaptureResultSchema } from "@/lib/style/styleCaptureResult";
import type { TaskDetail } from "@/lib/tasks/types";
import { useBackgroundTask } from "./useBackgroundTask";

const CAPTURE_FAILED = "Não foi possível analisar o documento. Tente novamente.";

/** Sends the reference document; the style analysis runs in the background and its result is restored by URL. */
export function useStyleCapture(initialTask: TaskDetail | null = null) {
  const background = useBackgroundTask(styleCaptureResultSchema, initialTask);
  const { start } = background;

  const analyze = useCallback(
    (file: File) => {
      const body = new FormData();
      body.append(UPLOAD_FILE_FIELD, file);
      return start(() => fetch(STYLE_CAPTURE_ENDPOINT, { method: "POST", body }), CAPTURE_FAILED);
    },
    [start],
  );

  return { background, result: background.result, isAnalyzing: background.isBusy, error: background.startError, analyze };
}
