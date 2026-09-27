import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { LOGIN_PATH } from "./paths";
import { readSession } from "./session";
import { isAdmin, type User } from "./types";

/** The signed-in user, read once per render. */
export const getCurrentUser = cache(async (): Promise<User | null> => (await readSession())?.user ?? null);

/** For pages: the signed-in user, or a redirect to the login page. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}

/** For admin pages: other users get the regular "not found" page. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();
  return user;
}
