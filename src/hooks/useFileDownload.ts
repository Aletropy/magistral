"use client";

import { useCallback, useState } from "react";
import { saveBlob } from "@/lib/browser/saveBlob";
import type { ExportFormat } from "@/lib/export/formats";
import type { ExportRequest } from "@/lib/export/schema";
import { NETWORK_ERROR_MESSAGE, postJson, readErrorMessage } from "@/lib/http/client";
import { EXPORT_ENDPOINT } from "@/lib/http/endpoints";

const EXPORT_FAILED = "Não foi possível gerar o arquivo. Tente novamente.";

export function useFileDownload() {
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (markdown: string, format: ExportFormat, fileName: string) => {
    setPendingFormat(format);
    setError(null);
    try {
      const response = await postJson(EXPORT_ENDPOINT, { markdown, format } satisfies ExportRequest);
      if (!response.ok) {
        setError(await readErrorMessage(response, EXPORT_FAILED));
        return;
      }
      saveBlob(await response.blob(), fileName);
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setPendingFormat(null);
    }
  }, []);

  return { pendingFormat, error, download };
}
