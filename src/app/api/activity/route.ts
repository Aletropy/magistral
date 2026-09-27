import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { ACTIVITY_SINCE_PARAM, type ActivityResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";

/** Caps one poll; anything beyond it arrives on the next one. */
const MAX_NEW_NOTIFICATIONS = 20;
const MAX_ACTIVE_TASKS = 20;

function parseSince(value: string | null): number | null {
  if (value === null) return null;
  const since = Number(value);
  return Number.isInteger(since) && since >= 0 ? since : null;
}

/**
 * What the nav polls: the user's running work, unread count and notifications after the client's cursor.
 * Without a cursor (first poll) no notifications are sent, so old ones don't pop up as toasts.
 */
export const GET = defineRoute({}, ({ request, user }) => {
  const requested = parseSince(new URL(request.url).searchParams.get(ACTIVITY_SINCE_PARAM));
  const notifications = getNotificationRepository();
  const newest = notifications.latestId(user.id);
  // A cursor past the newest id means the database was reset under an open tab; start over from here.
  const since = requested === null ? null : Math.min(requested, newest);
  const fresh = since === null ? [] : notifications.listSince(user.id, since, MAX_NEW_NOTIFICATIONS);
  const latestId = fresh.at(-1)?.id ?? since ?? newest;

  return Response.json({
    activeTasks: getTaskRepository().list({ ownerId: user.id, activeOnly: true, limit: MAX_ACTIVE_TASKS }),
    activeBatches: getBatchRepository().countActiveJobs(user.id),
    unreadCount: notifications.unreadCount(user.id),
    notifications: fresh,
    latestId,
  } satisfies ActivityResponseBody);
});
