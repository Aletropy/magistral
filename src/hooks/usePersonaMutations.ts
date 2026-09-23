"use client";

import { useCallback, useState } from "react";
import {
  NETWORK_ERROR_MESSAGE,
  PERSONAS_ENDPOINT,
  personaEndpoint,
  readErrorMessage,
  sendJson,
} from "@/lib/http/api";
import type { PersonaInput } from "@/lib/personas/schema";

const SAVE_FAILED = "Não foi possível salvar a persona. Tente novamente.";
const DELETE_FAILED = "Não foi possível excluir a persona. Tente novamente.";

/** Creates, updates and deletes personas; each call resolves to whether it succeeded. */
export function usePersonaMutations() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (request: () => Promise<Response>, fallback: string) => {
    setIsPending(true);
    setError(null);
    try {
      const response = await request();
      if (response.ok) return true;
      setError(await readErrorMessage(response, fallback));
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsPending(false);
    }
    return false;
  }, []);

  const save = useCallback(
    (input: PersonaInput, id?: string) =>
      run(
        () => (id ? sendJson("PUT", personaEndpoint(id), input) : sendJson("POST", PERSONAS_ENDPOINT, input)),
        SAVE_FAILED,
      ),
    [run],
  );

  const remove = useCallback(
    (id: string) => run(() => fetch(personaEndpoint(id), { method: "DELETE" }), DELETE_FAILED),
    [run],
  );

  return { isPending, error, save, remove };
}
