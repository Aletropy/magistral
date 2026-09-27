import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Who the current work is done for: the signed-in user in a request, or the owner of a background task.
 * Lets deep code (the LLM usage audit) attribute calls without threading a user id through every layer.
 */
const actorStorage = new AsyncLocalStorage<{ userId: string | null }>();

export function runAsUser<T>(userId: string | null, work: () => T): T {
  return actorStorage.run({ userId }, work);
}

/** The user the current work is done for; null outside a request or task. */
export function currentActorId(): string | null {
  return actorStorage.getStore()?.userId ?? null;
}
