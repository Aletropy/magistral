"use client";

import { useCallback, useState } from "react";
import { NETWORK_ERROR_MESSAGE, readErrorMessage, sendJson } from "@/lib/http/client";

export interface ResourceEndpoints {
  collection: string;
  item: (id: string) => string;
}

export interface ResourceMessages {
  saveFailed: string;
  deleteFailed: string;
}

/** JSON create (POST), update (PUT) and delete for one REST resource; each call resolves to whether it succeeded. */
export function useResourceMutations<Input>(endpoints: ResourceEndpoints, messages: ResourceMessages) {
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
    (input: Input, id?: string) =>
      run(
        () => (id ? sendJson("PUT", endpoints.item(id), input) : sendJson("POST", endpoints.collection, input)),
        messages.saveFailed,
      ),
    [run, endpoints, messages],
  );

  const remove = useCallback(
    (id: string) => run(() => fetch(endpoints.item(id), { method: "DELETE" }), messages.deleteFailed),
    [run, endpoints, messages],
  );

  return { isPending, error, save, remove };
}
