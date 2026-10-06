import { createUser } from "@/lib/auth/accounts";
import { newUserSchema } from "@/lib/auth/schema";
import type { UserResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";
import { HTTP_CREATED } from "@/lib/http/status";

export const POST = defineRoute({ access: "admin", body: newUserSchema, sensitive: true }, async ({ body }) => {
  const user = await createUser(body);
  return Response.json({ user } satisfies UserResponseBody, { status: HTTP_CREATED });
});
