import "server-only";
import {
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_UNAUTHORIZED,
} from "@/lib/http/api";
import { HttpError } from "@/lib/http/HttpError";
import { getSessionRepository, getUserRepository } from "./getAuthRepositories";
import { getLoginThrottle, throttleKey } from "./loginThrottle";
import {
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_SETUP_TOKEN_MESSAGE,
  LAST_ADMIN_MESSAGE,
  SELF_DISABLE_MESSAGE,
  SETUP_DONE_MESSAGE,
  TOO_MANY_ATTEMPTS_MESSAGE,
  USERNAME_TAKEN_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
  WRONG_CURRENT_PASSWORD_MESSAGE,
} from "./messages";
import { hashPassword, verifyPassword } from "./passwords";
import type { LoginInput, NewUserInput, PasswordChange, SetupInput, UserUpdate } from "./schema";
import { isValidSetupToken } from "./setupToken";
import type { User } from "./types";
import { UsernameTakenError, type NewUser } from "./userRepository";

/** Verified when the username doesn't exist, so a login takes as long whether or not the account exists. */
let decoyHash: Promise<string> | undefined;

/** Checks a login; returns the user or throws a 401/429 HttpError that never says which part was wrong. */
export async function signIn({ username, password }: LoginInput): Promise<User> {
  const throttle = getLoginThrottle();
  const key = throttleKey(username);
  if (throttle.isLocked(key, Date.now())) throw new HttpError(HTTP_TOO_MANY_REQUESTS, TOO_MANY_ATTEMPTS_MESSAGE);

  const credentials = getUserRepository().findCredentials(username);
  decoyHash ??= hashPassword(crypto.randomUUID());
  const valid = await verifyPassword(password, credentials?.passwordHash ?? (await decoyHash));
  if (!credentials || !valid || credentials.user.disabledAt) {
    throttle.recordFailure(key, Date.now());
    throw new HttpError(HTTP_UNAUTHORIZED, INVALID_CREDENTIALS_MESSAGE);
  }
  throttle.recordSuccess(key);
  return credentials.user;
}

function createOrExplain(create: () => User | null): User | null {
  try {
    return create();
  } catch (error) {
    if (error instanceof UsernameTakenError) throw new HttpError(HTTP_CONFLICT, USERNAME_TAKEN_MESSAGE);
    throw error;
  }
}

/** Creates the first admin with the setup code from the server log; they also get every earlier record. */
export async function setUpFirstAdmin({ setupToken, username, displayName, password }: SetupInput): Promise<User> {
  const users = getUserRepository();
  if (users.count() > 0) throw new HttpError(HTTP_CONFLICT, SETUP_DONE_MESSAGE);
  if (!isValidSetupToken(setupToken)) throw new HttpError(HTTP_FORBIDDEN, INVALID_SETUP_TOKEN_MESSAGE);
  const passwordHash = await hashPassword(password);
  const admin = createOrExplain(() => users.createFirstAdmin({ username, displayName, passwordHash }));
  if (!admin) throw new HttpError(HTTP_CONFLICT, SETUP_DONE_MESSAGE);
  return admin;
}

export async function createUser({ username, displayName, password, role }: NewUserInput): Promise<User> {
  const user: NewUser = { username, displayName, role, passwordHash: await hashPassword(password) };
  return createOrExplain(() => getUserRepository().create(user))!;
}

/** Applies an admin's change to an account, keeping at least one active admin and never locking oneself out. */
export async function updateUser(actor: User, id: string, update: UserUpdate): Promise<User> {
  const users = getUserRepository();
  const target = users.get(id);
  if (!target) throw new HttpError(HTTP_NOT_FOUND, USER_NOT_FOUND_MESSAGE);
  if (update.disabled && target.id === actor.id) throw new HttpError(HTTP_BAD_REQUEST, SELF_DISABLE_MESSAGE);

  const losesAdmin =
    target.role === "admin" && !target.disabledAt && (update.disabled === true || update.role === "member");
  if (losesAdmin && users.countActiveAdmins() <= 1) throw new HttpError(HTTP_CONFLICT, LAST_ADMIN_MESSAGE);

  const sessions = getSessionRepository();
  if (update.password !== undefined) {
    users.setPasswordHash(id, await hashPassword(update.password));
    sessions.deleteForUser(id);
  }
  const updated = users.update(id, {
    displayName: update.displayName,
    role: update.role,
    disabledAt: update.disabled === undefined ? undefined : update.disabled ? new Date() : null,
  });
  if (update.disabled) sessions.deleteForUser(id);
  return updated!;
}

/** Changes the signed-in user's password and ends their other sessions. */
export async function changeOwnPassword(user: User, sessionId: string, change: PasswordChange): Promise<void> {
  const users = getUserRepository();
  const credentials = users.findCredentials(user.username);
  if (!credentials || !(await verifyPassword(change.currentPassword, credentials.passwordHash))) {
    throw new HttpError(HTTP_BAD_REQUEST, WRONG_CURRENT_PASSWORD_MESSAGE);
  }
  users.setPasswordHash(user.id, await hashPassword(change.newPassword));
  getSessionRepository().deleteForUser(user.id, sessionId);
}
