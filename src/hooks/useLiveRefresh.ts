"use client";

import { useEffect } from "react";
import { LIVE_SAFETY_POLL_MS, useActivity } from "@/components/activity/ActivityProvider";

/**
 * Keeps something the page follows up to date while `active`: right away, then on every event from the
 * server's stream, polling every `fallbackIntervalMs` only while the stream is down (and rarely otherwise,
 * as a safety net).
 */
export function useLiveRefresh(refresh: () => Promise<void> | void, active: boolean, fallbackIntervalMs: number): void {
  const { live, changeCount } = useActivity();

  useEffect(() => {
    if (!active) return;
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), live ? LIVE_SAFETY_POLL_MS : fallbackIntervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active, live, refresh, fallbackIntervalMs]);

  useEffect(() => {
    if (active && changeCount > 0) void refresh();
  }, [active, changeCount, refresh]);
}
