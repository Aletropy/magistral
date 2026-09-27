"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { showOsNotification } from "@/lib/browser/osNotifications";
import { loginPath } from "@/lib/auth/paths";
import { HTTP_UNAUTHORIZED, activityEndpoint, type ActivityResponseBody } from "@/lib/http/api";
import type { AppNotification, NotificationLevel } from "@/lib/notifications/types";
import type { TaskSummary } from "@/lib/tasks/types";

/** Poll often while something runs, rarely otherwise. Background tabs are throttled by the browser anyway. */
export const ACTIVE_POLL_MS = 2000;
export const IDLE_POLL_MS = 15000;
const TOAST_ACTION_LABEL = "Ver";
/** Finished background work matters more than a passing hint, so its toasts stay longer than the default. */
const TOAST_DURATION_MS = 8000;

interface ActivitySnapshot {
  activeTasks: TaskSummary[];
  activeBatches: number;
  unreadCount: number;
}

interface ActivityContextValue extends ActivitySnapshot {
  /** Polls now, e.g. right after starting a task or reading notifications. */
  refresh: () => void;
}

const EMPTY_SNAPSHOT: ActivitySnapshot = { activeTasks: [], activeBatches: 0, unreadCount: 0 };

const ActivityContext = createContext<ActivityContextValue>({ ...EMPTY_SNAPSHOT, refresh: () => {} });

export function useActivity(): ActivityContextValue {
  return useContext(ActivityContext);
}

function isCurrentPage(href: string): boolean {
  return new URL(href, window.location.origin).pathname === window.location.pathname;
}

const TOASTS: Record<NotificationLevel, typeof toast.success> = {
  success: toast.success,
  error: toast.error,
  info: toast.info,
};

/**
 * Polls the server for running work and new notifications, and announces each new notification as a
 * toast (and as a system notification when the tab is hidden and the user opted in).
 */
export function ActivityProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<ActivitySnapshot>(EMPTY_SNAPSHOT);
  const cursor = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<() => Promise<void>>(async () => {});
  /** One poll at a time: a refresh asked for mid-poll runs right after it, with the updated cursor. */
  const inFlight = useRef(false);
  const refreshQueued = useRef(false);

  const announce = useCallback(
    (notification: AppNotification) => {
      const { href } = notification;
      // The page the result belongs to is already on screen and shows it.
      if (href && isCurrentPage(href) && !document.hidden) return;
      const open = href ? () => router.push(href) : () => {};
      TOASTS[notification.level](notification.title, {
        // Keyed by notification, so a notification can never show up twice.
        id: notification.id,
        description: notification.body || undefined,
        duration: TOAST_DURATION_MS,
        action: href ? { label: TOAST_ACTION_LABEL, onClick: open } : undefined,
      });
      showOsNotification(notification, open);
    },
    [router],
  );

  const poll = useCallback(async () => {
    if (inFlight.current) {
      refreshQueued.current = true;
      return;
    }
    inFlight.current = true;
    if (timer.current) clearTimeout(timer.current);
    let busy = false;
    try {
      const response = await fetch(activityEndpoint(cursor.current), { cache: "no-store" });
      if (response.status === HTTP_UNAUTHORIZED) {
        // The session expired or was ended (password reset, account disabled): sign in again.
        window.location.assign(loginPath(`${window.location.pathname}${window.location.search}`));
        return;
      }
      if (response.ok) {
        const body = (await response.json()) as ActivityResponseBody;
        cursor.current = body.latestId;
        body.notifications.forEach(announce);
        // Finished work changes what server-rendered pages show (history, library, batches).
        if (body.notifications.length > 0) router.refresh();
        setSnapshot({
          activeTasks: body.activeTasks,
          activeBatches: body.activeBatches,
          unreadCount: body.unreadCount,
        });
        busy = body.activeTasks.length > 0 || body.activeBatches > 0;
      }
    } catch {
      // Offline or the server restarted: try again on the next tick.
    } finally {
      inFlight.current = false;
    }
    if (refreshQueued.current) {
      refreshQueued.current = false;
      void pollRef.current();
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void pollRef.current(), busy ? ACTIVE_POLL_MS : IDLE_POLL_MS);
  }, [announce, router]);

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  useEffect(() => {
    void pollRef.current();
    const onVisible = () => {
      if (!document.hidden) void pollRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const refresh = useCallback(() => void pollRef.current(), []);
  const value = useMemo(() => ({ ...snapshot, refresh }), [snapshot, refresh]);

  return <ActivityContext value={value}>{children}</ActivityContext>;
}
