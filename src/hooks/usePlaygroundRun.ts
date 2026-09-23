"use client";

import { useCallback, useState } from "react";
import {
  NETWORK_ERROR_MESSAGE,
  PLAYGROUND_ENDPOINT,
  postJson,
  readErrorMessage,
  type PlaygroundResponseBody,
} from "@/lib/http/api";
import type { PlaygroundRequest } from "@/lib/playground/schema";

const REWRITE_FAILED = "Não foi possível reescrever o texto. Tente novamente.";

export function usePlaygroundRun() {
  const [result, setResult] = useState<PlaygroundResponseBody | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (request: PlaygroundRequest) => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await postJson(PLAYGROUND_ENDPOINT, request);
      if (!response.ok) {
        setError(await readErrorMessage(response, REWRITE_FAILED));
        return;
      }
      setResult((await response.json()) as PlaygroundResponseBody);
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { result, isRunning, error, setError, run };
}
