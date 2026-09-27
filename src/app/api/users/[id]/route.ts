import { updateUser } from "@/lib/auth/accounts";
import { userUpdateSchema } from "@/lib/auth/schema";
import type { UserResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";

/** Renames, changes the role, disables or enables an account, or resets its password. */
export const PATCH = defineRoute(
  { access: "admin", body: userUpdateSchema },
  async ({ user, body }, ctx: RouteContext<"/api/users/[id]">) => {
    const updated = await updateUser(user, (await ctx.params).id, body);
    return Response.json({ user: updated } satisfies UserResponseBody);
  },
);
