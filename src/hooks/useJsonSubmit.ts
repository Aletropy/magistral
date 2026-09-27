"use client";

import { useCallback, useState } from "react";
import { NETWORK_ERROR_MESSAGE, readErrorMessage, sendJson } from "@/lib/http/api";

/** Sends one JSON request for a form, keeping its pending state and the pt-BR error to show. */
export function useJsonSubmit() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Resolves to the successful response, or null after recording the error. */
  const submit = useCallback(
    async (method: "POST" | "PATCH", url: string, body: unknown, fallback: string): Promise<Response | null> => {
      setIsPending(true);
      setError(null);
      try {
        const response = await sendJson(method, url, body);
        if (response.ok) return response;
        setError(await readErrorMessage(response, fallback));
      } catch {
        setError(NETWORK_ERROR_MESSAGE);
      } finally {
        setIsPending(false);
      }
      return null;
    },
    [],
  );

  return { isPending, error, setError, submit };
}
