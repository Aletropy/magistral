import { subscribeActivity } from "@/lib/events/activityEvents";
import { ACTIVITY_EVENT_NAME } from "@/lib/http/endpoints";
import { defineRoute } from "@/lib/http/route";

/** Keeps proxies and the browser from closing an idle stream. */
const HEARTBEAT_INTERVAL_MS = 25_000;
/** How long the browser waits before reconnecting after the stream drops. */
const RECONNECT_DELAY_MS = 3_000;
const ACTIVITY_EVENT = `event: ${ACTIVITY_EVENT_NAME}\ndata: {}\n\n`;
const HEARTBEAT = ": heartbeat\n\n";

/**
 * A server-sent event stream that says "your background work changed" whenever it does; pages then
 * refresh through the regular routes. It carries no data, so it can't leak anything by itself.
 */
export const GET = defineRoute({}, ({ request, user }) => {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send(`retry: ${RECONNECT_DELAY_MS}\n\n`);
      const unsubscribe = subscribeActivity(user.id, () => send(ACTIVITY_EVENT));
      const heartbeat = setInterval(() => send(HEARTBEAT), HEARTBEAT_INTERVAL_MS);
      cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      });
    },
    cancel: () => cleanup(),
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform keeps the server's compression from buffering the stream.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
