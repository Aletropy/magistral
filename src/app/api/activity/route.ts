import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { ACTIVITY_SINCE_PARAM, type ActivityResponseBody } from "@/lib/http/api";
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
 * What the nav polls: running work, the unread count and notifications after the client's cursor.
 * Without a cursor (first poll) no notifications are sent, so old ones don't pop up as toasts.
 */
export async function GET(request: Request): Promise<Response> {
  const since = parseSince(new URL(request.url).searchParams.get(ACTIVITY_SINCE_PARAM));
  const notifications = getNotificationRepository();
  const fresh = since === null ? [] : notifications.listSince(since, MAX_NEW_NOTIFICATIONS);
  const latestId = fresh.at(-1)?.id ?? (since === null ? notifications.latestId() : since);

  return Response.json({
    activeTasks: getTaskRepository().list({ activeOnly: true, limit: MAX_ACTIVE_TASKS }),
    activeBatches: getBatchRepository().countActiveJobs(),
    unreadCount: notifications.unreadCount(),
    notifications: fresh,
    latestId,
  } satisfies ActivityResponseBody);
}
