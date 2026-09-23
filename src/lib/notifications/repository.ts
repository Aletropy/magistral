import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { NOTIFICATION_LEVELS, type AppNotification, type NewNotification } from "./types";

const notificationRowSchema = z.object({
  id: z.number(),
  level: z.enum(NOTIFICATION_LEVELS),
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  task_id: z.string().nullable(),
  created_at: z.string(),
  read_at: z.string().nullable(),
});

const countRowSchema = z.object({ count: z.number() });
const maxIdRowSchema = z.object({ id: z.number().nullable() });

export interface NotificationRepository {
  create(notification: NewNotification): AppNotification;
  /** Notifications newer than `afterId`, oldest first. */
  listSince(afterId: number, limit: number): AppNotification[];
  /** The newest notifications, newest first. */
  listRecent(limit: number): AppNotification[];
  /** The newest id, or 0 when there are none; a client starts polling from here. */
  latestId(): number;
  unreadCount(): number;
  markRead(ids: number[], now: Date): number;
  markAllRead(now: Date): number;
  purgeBefore(before: Date): number;
}

function toNotification(row: unknown): AppNotification {
  const parsed = notificationRowSchema.parse(row);
  return {
    id: parsed.id,
    level: parsed.level,
    title: parsed.title,
    body: parsed.body,
    href: parsed.href,
    taskId: parsed.task_id,
    createdAt: parsed.created_at,
    readAt: parsed.read_at,
  };
}

const COLUMNS = "id, level, title, body, href, task_id, created_at, read_at";

export function createNotificationRepository(db: DatabaseSync): NotificationRepository {
  const insert = db.prepare(
    `INSERT INTO notifications (level, title, body, href, task_id) VALUES (?, ?, ?, ?, ?) RETURNING ${COLUMNS}`,
  );
  const selectSince = db.prepare(`SELECT ${COLUMNS} FROM notifications WHERE id > ? ORDER BY id LIMIT ?`);
  const selectRecent = db.prepare(`SELECT ${COLUMNS} FROM notifications ORDER BY id DESC LIMIT ?`);
  const selectLatestId = db.prepare("SELECT MAX(id) AS id FROM notifications");
  const countUnread = db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE read_at IS NULL");
  const markOne = db.prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND read_at IS NULL");
  const markAll = db.prepare("UPDATE notifications SET read_at = ? WHERE read_at IS NULL");
  const purge = db.prepare("DELETE FROM notifications WHERE created_at < ?");

  return {
    create: ({ level, title, body, href, taskId }) => toNotification(insert.get(level, title, body, href, taskId)),
    listSince: (afterId, limit) => selectSince.all(afterId, limit).map(toNotification),
    listRecent: (limit) => selectRecent.all(limit).map(toNotification),
    latestId: () => maxIdRowSchema.parse(selectLatestId.get()).id ?? 0,
    unreadCount: () => countRowSchema.parse(countUnread.get()).count,
    markRead(ids, now) {
      const at = now.toISOString();
      return ids.reduce((changed, id) => changed + Number(markOne.run(at, id).changes), 0);
    },
    markAllRead: (now) => Number(markAll.run(now.toISOString()).changes),
    purgeBefore: (before) => Number(purge.run(before.toISOString()).changes),
  };
}
