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

/** Reads and marks are limited to one owner's notifications. */
export interface NotificationRepository {
  create(notification: NewNotification): AppNotification;
  /** Notifications newer than `afterId`, oldest first. */
  listSince(ownerId: string, afterId: number, limit: number): AppNotification[];
  /** The newest notifications, newest first. */
  listRecent(ownerId: string, limit: number): AppNotification[];
  /** The owner's newest id, or 0 when there are none; a client starts polling from here. */
  latestId(ownerId: string): number;
  unreadCount(ownerId: string): number;
  markRead(ownerId: string, ids: number[], now: Date): number;
  markAllRead(ownerId: string, now: Date): number;
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
    `INSERT INTO notifications (owner_id, level, title, body, href, task_id) VALUES (?, ?, ?, ?, ?, ?)
     RETURNING ${COLUMNS}`,
  );
  const selectSince = db.prepare(
    `SELECT ${COLUMNS} FROM notifications WHERE owner_id = ? AND id > ? ORDER BY id LIMIT ?`,
  );
  const selectRecent = db.prepare(`SELECT ${COLUMNS} FROM notifications WHERE owner_id = ? ORDER BY id DESC LIMIT ?`);
  const selectLatestId = db.prepare("SELECT MAX(id) AS id FROM notifications WHERE owner_id = ?");
  const countUnread = db.prepare(
    "SELECT COUNT(*) AS count FROM notifications WHERE owner_id = ? AND read_at IS NULL",
  );
  const markOne = db.prepare(
    "UPDATE notifications SET read_at = ? WHERE id = ? AND owner_id = ? AND read_at IS NULL",
  );
  const markAll = db.prepare("UPDATE notifications SET read_at = ? WHERE owner_id = ? AND read_at IS NULL");
  const purge = db.prepare("DELETE FROM notifications WHERE created_at < ?");

  return {
    create: ({ ownerId, level, title, body, href, taskId }) =>
      toNotification(insert.get(ownerId, level, title, body, href, taskId)),
    listSince: (ownerId, afterId, limit) => selectSince.all(ownerId, afterId, limit).map(toNotification),
    listRecent: (ownerId, limit) => selectRecent.all(ownerId, limit).map(toNotification),
    latestId: (ownerId) => maxIdRowSchema.parse(selectLatestId.get(ownerId)).id ?? 0,
    unreadCount: (ownerId) => countRowSchema.parse(countUnread.get(ownerId)).count,
    markRead(ownerId, ids, now) {
      const at = now.toISOString();
      return ids.reduce((changed, id) => changed + Number(markOne.run(at, id, ownerId).changes), 0);
    },
    markAllRead: (ownerId, now) => Number(markAll.run(now.toISOString(), ownerId).changes),
    purgeBefore: (before) => Number(purge.run(before.toISOString()).changes),
  };
}
