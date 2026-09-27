import { changeOwnPassword } from "@/lib/auth/accounts";
import { passwordChangeSchema } from "@/lib/auth/schema";
import { defineRoute } from "@/lib/http/route";
import { HTTP_NO_CONTENT } from "@/lib/http/status";

/** Changes the signed-in user's password; their other sessions end. */
export const POST = defineRoute({ body: passwordChangeSchema }, async ({ user, sessionId, body }) => {
  await changeOwnPassword(user, sessionId, body);
  return new Response(null, { status: HTTP_NO_CONTENT });
});
