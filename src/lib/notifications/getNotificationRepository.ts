import "server-only";
import { getDb } from "@/lib/db/client";
import { createNotificationRepository, type NotificationRepository } from "./repository";

export function getNotificationRepository(): NotificationRepository {
  return createNotificationRepository(getDb());
}
