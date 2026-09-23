"use client";

import { useCallback, useState } from "react";
import {
  EXTRACT_TEXT_ENDPOINT,
  NETWORK_ERROR_MESSAGE,
  UPLOAD_FILE_FIELD,
  readErrorMessage,
  type ExtractTextResponseBody,
} from "@/lib/http/api";

const EXTRACT_FAILED = "Não foi possível ler o arquivo. Tente outro PDF ou DOCX.";

/** Reads the text of an uploaded PDF or DOCX on the server (quick, no AI); resolves to null on failure. */
export function useDocumentText() {
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async (file: File): Promise<string | null> => {
    setIsReading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append(UPLOAD_FILE_FIELD, file);
      const response = await fetch(EXTRACT_TEXT_ENDPOINT, { method: "POST", body });
      if (!response.ok) {
        setError(await readErrorMessage(response, EXTRACT_FAILED));
        return null;
      }
      return ((await response.json()) as ExtractTextResponseBody).text;
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      return null;
    } finally {
      setIsReading(false);
    }
  }, []);

  return { isReading, error, read };
}
