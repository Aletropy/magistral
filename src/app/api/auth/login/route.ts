import { signIn } from "@/lib/auth/accounts";
import { loginSchema } from "@/lib/auth/schema";
import { startSession } from "@/lib/auth/session";
import { HTTP_NO_CONTENT } from "@/lib/http/api";
import { definePublicRoute } from "@/lib/http/route";

export const POST = definePublicRoute({ body: loginSchema }, async ({ request, body }) => {
  const user = await signIn(body);
  await startSession(request, user.id);
  return new Response(null, { status: HTTP_NO_CONTENT });
});
