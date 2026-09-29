import { AppError } from "@/lib/errors/AppError";
import { defineRoute } from "@/lib/http/route";
import { HTTP_SEE_OTHER } from "@/lib/http/status";
import { finishAuthorization } from "@/lib/integrations/jurisprudencias/connection";
import { CONNECTION_RESULTS, CONNECTION_RESULT_PARAM, INTEGRATIONS_PATH } from "@/lib/integrations/paths";

/**
 * Where Jurisprudências.ai sends the admin back (a top-level navigation, so the session cookie comes
 * along). Always ends on Integrações; a failure is recorded there as the connection's last error.
 */
export const GET = defineRoute({ access: "admin" }, async ({ request, user }) => {
  const url = new URL(request.url);
  let result: string = CONNECTION_RESULTS.connected;
  try {
    await finishAuthorization({
      requestOrigin: url.origin,
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
      error: url.searchParams.get("error"),
      userId: user.id,
    });
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    result = CONNECTION_RESULTS.failed;
  }
  // A relative Location stays on the address the browser used, behind Caddy or not.
  const location = `${INTEGRATIONS_PATH}?${new URLSearchParams({ [CONNECTION_RESULT_PARAM]: result })}`;
  return new Response(null, { status: HTTP_SEE_OTHER, headers: { Location: location } });
});
