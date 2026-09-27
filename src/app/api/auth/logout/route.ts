import { endSession } from "@/lib/auth/session";
import { definePublicRoute } from "@/lib/http/route";
import { HTTP_NO_CONTENT } from "@/lib/http/status";

/** Public so an expired session can still clear its cookie. */
export const POST = definePublicRoute({}, async () => {
  await endSession();
  return new Response(null, { status: HTTP_NO_CONTENT });
});
