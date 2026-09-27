import { createUser } from "@/lib/auth/accounts";
import { newUserSchema } from "@/lib/auth/schema";
import { HTTP_CREATED, type UserResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";

export const POST = defineRoute({ access: "admin", body: newUserSchema }, async ({ body }) => {
  const user = await createUser(body);
  return Response.json({ user } satisfies UserResponseBody, { status: HTTP_CREATED });
});
