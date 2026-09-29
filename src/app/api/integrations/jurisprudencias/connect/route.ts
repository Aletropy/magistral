import type { AuthorizationStartedResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";
import { startAuthorization } from "@/lib/integrations/jurisprudencias/connection";

/** Starts connecting the office's account; the browser then goes to the returned address. */
export const POST = defineRoute({ access: "admin" }, async ({ request }) => {
  const url = await startAuthorization(new URL(request.url).origin);
  return Response.json({ authorizationUrl: url.toString() } satisfies AuthorizationStartedResponseBody);
});
