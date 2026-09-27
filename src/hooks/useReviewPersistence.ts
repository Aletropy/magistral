"use client";

import { useCallback, useState } from "react";
import { sendJson } from "@/lib/http/client";
import { minutaEndpoint } from "@/lib/http/endpoints";
import { REVIEW_SAVE_FAILED_MESSAGE } from "@/lib/minutas/messages";
import type { MinutaUpdate } from "@/lib/minutas/schema";

/** Saves a reviewed minuta text to the history; reports failures without undoing the review on screen. */
export function useReviewPersistence() {
  const [saveError, setSaveError] = useState<string | null>(null);

  const persist = useCallback(async (id: string, markdown: string) => {
    setSaveError(null);
    try {
      const response = await sendJson("PUT", minutaEndpoint(id), { markdown } satisfies MinutaUpdate);
      if (!response.ok) setSaveError(REVIEW_SAVE_FAILED_MESSAGE);
    } catch {
      setSaveError(REVIEW_SAVE_FAILED_MESSAGE);
    }
  }, []);

  return { persist, saveError };
}
