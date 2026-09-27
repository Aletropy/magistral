import type { NotificationsResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";

/** How many notifications the bell panel shows. */
const NOTIFICATION_LIST_LIMIT = 30;

export const GET = defineRoute({}, ({ user }) => {
  const notifications = getNotificationRepository();
  return Response.json({
    notifications: notifications.listRecent(user.id, NOTIFICATION_LIST_LIMIT),
    unreadCount: notifications.unreadCount(user.id),
  } satisfies NotificationsResponseBody);
});
