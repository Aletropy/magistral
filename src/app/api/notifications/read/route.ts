import { HTTP_NO_CONTENT } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";
import { markReadSchema } from "@/lib/notifications/schema";

export const POST = defineRoute({ body: markReadSchema }, ({ user, body }) => {
  const notifications = getNotificationRepository();
  const now = new Date();
  if ("all" in body) notifications.markAllRead(user.id, now);
  else notifications.markRead(user.id, body.ids, now);
  return new Response(null, { status: HTTP_NO_CONTENT });
});
