"use client";

import { useCallback, useState } from "react";
import {
  NETWORK_ERROR_MESSAGE,
  STYLE_CAPTURE_ENDPOINT,
  UPLOAD_FILE_FIELD,
  readErrorMessage,
  type StyleCaptureResponseBody,
} from "@/lib/http/api";
import type { StyleCaptureResult } from "@/lib/style/captureStyle";

const CAPTURE_FAILED = "Não foi possível analisar o documento. Tente novamente.";

export function useStyleCapture() {
  const [result, setResult] = useState<StyleCaptureResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const body = new FormData();
      body.append(UPLOAD_FILE_FIELD, file);
      const response = await fetch(STYLE_CAPTURE_ENDPOINT, { method: "POST", body });
      if (!response.ok) {
        setError(await readErrorMessage(response, CAPTURE_FAILED));
        return;
      }
      setResult(((await response.json()) as StyleCaptureResponseBody).result);
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { result, isAnalyzing, error, analyze };
}
