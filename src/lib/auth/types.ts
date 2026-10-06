export const USER_ROLES = ["admin", "member"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  member: "Membro",
};

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  /** Disabled users can't sign in; their sessions are ended when they are disabled. */
  disabledAt: string | null;
  /** True when an admin set a walk-away PIN for this account (the lock gates pages and APIs). */
  hasPin: boolean;
}

/** What client components get about the signed-in user. */
export type CurrentUser = Pick<User, "id" | "username" | "displayName" | "role">;

export function toCurrentUser({ id, username, displayName, role }: User): CurrentUser {
  return { id, username, displayName, role };
}

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "admin";
}
