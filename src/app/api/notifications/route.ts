import type { NotificationsResponseBody } from "@/lib/http/api";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";

/** How many notifications the bell panel shows. */
const NOTIFICATION_LIST_LIMIT = 30;

export async function GET(): Promise<Response> {
  const notifications = getNotificationRepository();
  return Response.json({
    notifications: notifications.listRecent(NOTIFICATION_LIST_LIMIT),
    unreadCount: notifications.unreadCount(),
  } satisfies NotificationsResponseBody);
}
