/** Where the user's opt-in to system notifications is kept (the browser permission is separate). */
export const OS_NOTIFICATIONS_STORAGE_KEY = "magistral-os-notifications";
const CHANGE_EVENT = "magistral-os-notifications-change";
const ENABLED = "on";

export function areOsNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Opted in and allowed by the browser. */
export function areOsNotificationsEnabled(): boolean {
  if (!areOsNotificationsSupported() || Notification.permission !== "granted") return false;
  try {
    return localStorage.getItem(OS_NOTIFICATIONS_STORAGE_KEY) === ENABLED;
  } catch {
    return false;
  }
}

/** For useSyncExternalStore: fires when the opt-in changes in this tab or another one. */
export function subscribeOsNotifications(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Turns system notifications on (asking the browser for permission) or off; resolves to the new state. */
export async function setOsNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (!areOsNotificationsSupported()) return false;
  if (enabled && Notification.permission !== "granted") {
    if ((await Notification.requestPermission()) !== "granted") return false;
  }
  try {
    if (enabled) localStorage.setItem(OS_NOTIFICATIONS_STORAGE_KEY, ENABLED);
    else localStorage.removeItem(OS_NOTIFICATIONS_STORAGE_KEY);
  } catch {
    // Storage unavailable: the choice can't be remembered.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return areOsNotificationsEnabled();
}

export interface OsNotification {
  id: number;
  title: string;
  body: string;
}

/**
 * Shows a system notification while the tab is in the background. The tag is the notification id, so
 * several open tabs raise it only once.
 */
export function showOsNotification(notification: OsNotification, onClick: () => void): void {
  if (!document.hidden || !areOsNotificationsEnabled()) return;
  const shown = new Notification(notification.title, { body: notification.body, tag: String(notification.id) });
  shown.onclick = () => {
    window.focus();
    onClick();
    shown.close();
  };
}
