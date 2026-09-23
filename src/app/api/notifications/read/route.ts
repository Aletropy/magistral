import { HTTP_NO_CONTENT, parseJsonBody } from "@/lib/http/api";
import { getNotificationRepository } from "@/lib/notifications/getNotificationRepository";
import { markReadSchema } from "@/lib/notifications/schema";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, markReadSchema);
  if ("response" in parsed) return parsed.response;
  const notifications = getNotificationRepository();
  const now = new Date();
  if ("all" in parsed.data) notifications.markAllRead(now);
  else notifications.markRead(parsed.data.ids, now);
  return new Response(null, { status: HTTP_NO_CONTENT });
}
