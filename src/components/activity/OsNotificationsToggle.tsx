"use client";

import { useState, useSyncExternalStore } from "react";
import {
  areOsNotificationsEnabled,
  areOsNotificationsSupported,
  setOsNotificationsEnabled,
  subscribeOsNotifications,
} from "@/lib/browser/osNotifications";

const BLOCKED_MESSAGE = "O navegador bloqueou as notificações. Libere-as nas configurações do site.";

function serverSnapshot(): boolean {
  return false;
}

/** Opt-in to system notifications, shown when a task finishes while the tab is in the background. */
export function OsNotificationsToggle() {
  const enabled = useSyncExternalStore(subscribeOsNotifications, areOsNotificationsEnabled, serverSnapshot);
  const supported = useSyncExternalStore(subscribeOsNotifications, areOsNotificationsSupported, serverSnapshot);
  const [blocked, setBlocked] = useState(false);

  if (!supported) return null;

  async function handleChange(checked: boolean) {
    const result = await setOsNotificationsEnabled(checked);
    setBlocked(checked && !result);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={enabled}
          onChange={(event) => void handleChange(event.target.checked)}
        />
        Avisar pelo sistema quando a aba estiver em segundo plano
      </label>
      {blocked && <p className="text-xs text-destructive">{BLOCKED_MESSAGE}</p>}
    </div>
  );
}
