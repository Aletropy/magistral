"use client";

import { useCallback, useState } from "react";
import {
  MINUTA_ENDPOINT,
  NETWORK_ERROR_MESSAGE,
  postJson,
  readErrorMessage,
  type MinutaResponseBody,
} from "@/lib/http/api";
import type { MinutaRequest } from "@/lib/minuta/schema";

const GENERATION_FAILED = "Não foi possível gerar a minuta. Tente novamente.";

export function useMinutaGeneration() {
  const [result, setResult] = useState<MinutaResponseBody | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (request: MinutaRequest) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await postJson(MINUTA_ENDPOINT, request);
      if (!response.ok) {
        setError(await readErrorMessage(response, GENERATION_FAILED));
        return;
      }
      setResult((await response.json()) as MinutaResponseBody);
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { result, isGenerating, error, generate };
}
