/** Where the user's opt-in to system notifications is kept (the browser permission is separate). */
export const OS_NOTIFICATIONS_STORAGE_KEY = "magistral-os-notifications";
const CHANGE_EVENT = "magistral-os-notifications-change";
const ENABLED = "on";
const CONFIRMATION_TITLE = "Avisos do Magistral ativados";
const CONFIRMATION_BODY = "Você será avisado quando uma tarefa terminar com a aba em segundo plano.";

/** Shows a notification right away; false when the browser can't (Android only allows it from a service worker). */
function canShowNotifications(): boolean {
  try {
    new Notification(CONFIRMATION_TITLE, { body: CONFIRMATION_BODY });
    return true;
  } catch {
    return false;
  }
}

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
  if (enabled && !canShowNotifications()) return false;
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
  let shown: Notification;
  try {
    shown = new Notification(notification.title, { body: notification.body, tag: String(notification.id) });
  } catch {
    // Android browsers only show notifications through a service worker; the toast still announces it.
    return;
  }
  shown.onclick = () => {
    window.focus();
    onClick();
    shown.close();
  };
}
