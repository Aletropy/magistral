import { setUpFirstAdmin } from "@/lib/auth/accounts";
import { setupSchema } from "@/lib/auth/schema";
import { startSession } from "@/lib/auth/session";
import { definePublicRoute } from "@/lib/http/route";
import { HTTP_CREATED } from "@/lib/http/status";

/** Creates the first admin (only while there are no users) and signs them in. */
export const POST = definePublicRoute({ body: setupSchema }, async ({ request, body }) => {
  const admin = await setUpFirstAdmin(body);
  await startSession(request, admin.id);
  return new Response(null, { status: HTTP_CREATED });
});
