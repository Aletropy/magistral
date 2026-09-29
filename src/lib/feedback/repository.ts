import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

const feedbackRowSchema = z.object({
  id: z.number(),
  page: z.string(),
  message: z.string(),
  created_at: z.string(),
  resolved_at: z.string().nullable(),
  author: z.string().nullable(),
});

export interface Feedback {
  id: number;
  page: string;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
  /** The sender's name; null when their account was removed. */
  author: string | null;
}

export interface FeedbackRepository {
  create(userId: string, page: string, message: string): number;
  /** Open reports first, newest first. */
  list(limit: number): Feedback[];
  countOpen(): number;
  setResolved(id: number, resolvedAt: Date | null): boolean;
}

export function createFeedbackRepository(db: DatabaseSync): FeedbackRepository {
  const insert = db.prepare("INSERT INTO feedback (user_id, page, message) VALUES (?, ?, ?) RETURNING id");
  const selectRecent = db.prepare(
    `SELECT f.id, f.page, f.message, f.created_at, f.resolved_at, u.display_name AS author
     FROM feedback f LEFT JOIN users u ON u.id = f.user_id
     ORDER BY f.resolved_at IS NOT NULL, f.created_at DESC LIMIT ?`,
  );
  const countUnresolved = db.prepare("SELECT COUNT(*) AS count FROM feedback WHERE resolved_at IS NULL");
  const updateResolved = db.prepare("UPDATE feedback SET resolved_at = ? WHERE id = ?");

  return {
    create: (userId, page, message) => z.object({ id: z.number() }).parse(insert.get(userId, page, message)).id,
    list: (limit) =>
      selectRecent.all(limit).map((row) => {
        const parsed = feedbackRowSchema.parse(row);
        return {
          id: parsed.id,
          page: parsed.page,
          message: parsed.message,
          createdAt: parsed.created_at,
          resolvedAt: parsed.resolved_at,
          author: parsed.author,
        };
      }),
    countOpen: () => z.object({ count: z.number() }).parse(countUnresolved.get()).count,
    setResolved: (id, resolvedAt) => updateResolved.run(resolvedAt?.toISOString() ?? null, id).changes > 0,
  };
}
