"use client";

import { useCallback, useEffect, useState } from "react";
import { isJobActive, type BatchJobDetail } from "@/lib/batch/types";
import { HTTP_NOT_FOUND, batchEndpoint, type BatchResponseBody } from "@/lib/http/api";

/** How often an active batch is refreshed. */
export const BATCH_POLL_INTERVAL_MS = 3000;

/** Polls the job while it still has pending or running items; stops once everything finished. */
export function useBatchProgress(initial: BatchJobDetail) {
  const [job, setJob] = useState(initial);
  const [isStale, setIsStale] = useState(false);
  /** The job was deleted (e.g. in another tab): polling stops. */
  const [isDeleted, setIsDeleted] = useState(false);
  const active = !isDeleted && isJobActive(job);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(batchEndpoint(initial.id), { cache: "no-store" });
      if (response.status === HTTP_NOT_FOUND) {
        setIsDeleted(true);
        setIsStale(false);
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      setJob(((await response.json()) as BatchResponseBody).job);
      setIsStale(false);
    } catch {
      setIsStale(true);
    }
  }, [initial.id]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void refresh(), BATCH_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active, refresh]);

  return { job, active, isStale, isDeleted, refresh };
}
