"use client";

import { useCallback, useState } from "react";
import {
  LIBRARY_SOURCES_ENDPOINT,
  LIBRARY_SYNC_ENDPOINT,
  NETWORK_ERROR_MESSAGE,
  UPLOAD_FILE_FIELD,
  UPLOAD_KIND_FIELD,
  librarySourceEndpoint,
  readErrorMessage,
} from "@/lib/http/api";
import type { LibrarySourceKind } from "@/lib/rag/types";

const REQUEST_FAILED = "Não foi possível concluir a operação na biblioteca. Tente novamente.";

/** Upload, folder sync and delete for the library; each call resolves to the parsed body, or null on failure. */
export function useLibraryActions() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(request: () => Promise<Response>, parse: (response: Response) => Promise<T>) => {
    setIsPending(true);
    setError(null);
    try {
      const response = await request();
      if (response.ok) return await parse(response);
      setError(await readErrorMessage(response, REQUEST_FAILED));
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsPending(false);
    }
    return null;
  }, []);

  const upload = useCallback(
    <T,>(files: File[], kind: LibrarySourceKind) => {
      const body = new FormData();
      files.forEach((file) => body.append(UPLOAD_FILE_FIELD, file));
      body.append(UPLOAD_KIND_FIELD, kind);
      return run(() => fetch(LIBRARY_SOURCES_ENDPOINT, { method: "POST", body }), (response) => response.json() as Promise<T>);
    },
    [run],
  );

  const sync = useCallback(
    <T,>() => run(() => fetch(LIBRARY_SYNC_ENDPOINT, { method: "POST" }), (response) => response.json() as Promise<T>),
    [run],
  );

  const remove = useCallback(
    (id: number) => run(() => fetch(librarySourceEndpoint(id), { method: "DELETE" }), async () => true),
    [run],
  );

  return { isPending, error, upload, sync, remove };
}
