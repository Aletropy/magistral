export const NOTIFICATION_LEVELS = ["success", "error", "info"] as const;
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];

/** What a finished task or batch has to say, before it is stored. */
export interface NotificationDraft {
  level: NotificationLevel;
  title: string;
  body: string;
  /** Where the result can be seen; null when there is nothing to open. */
  href: string | null;
}

export interface NewNotification extends NotificationDraft {
  taskId: string | null;
}

export interface AppNotification extends NotificationDraft {
  /** Increasing, so clients can ask for everything after the last id they saw. */
  id: number;
  taskId: string | null;
  createdAt: string;
  readAt: string | null;
}
