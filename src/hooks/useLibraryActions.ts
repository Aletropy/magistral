"use client";

import { useCallback, useState } from "react";
import { NETWORK_ERROR_MESSAGE, librarySourceEndpoint, readErrorMessage } from "@/lib/http/api";

const REMOVE_FAILED = "Não foi possível remover o documento. Tente novamente.";

/** Removing a source is quick, so it stays a plain request; the slow library actions run as tasks. */
export function useLibraryActions() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async (id: number) => {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch(librarySourceEndpoint(id), { method: "DELETE" });
      if (response.ok) return true;
      setError(await readErrorMessage(response, REMOVE_FAILED));
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsPending(false);
    }
    return false;
  }, []);

  return { isPending, error, remove };
}
