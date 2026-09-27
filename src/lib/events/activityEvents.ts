import { EventEmitter } from "node:events";

/**
 * Tells a user's open pages that their background work changed (a task started, progressed or ended, a
 * batch item finished, a notification arrived), so they refresh at once instead of polling. The event
 * carries nothing: pages fetch what they show through the regular, access-checked routes.
 */
const globalForEvents = globalThis as typeof globalThis & { magistralActivityEvents?: EventEmitter };

function emitter(): EventEmitter {
  if (!globalForEvents.magistralActivityEvents) {
    const events = new EventEmitter();
    // One listener per open tab of every signed-in user.
    events.setMaxListeners(0);
    globalForEvents.magistralActivityEvents = events;
  }
  return globalForEvents.magistralActivityEvents;
}

export function publishActivity(userId: string | null): void {
  if (userId) emitter().emit(userId);
}

export function subscribeActivity(userId: string, listener: () => void): () => void {
  const events = emitter();
  events.on(userId, listener);
  return () => void events.off(userId, listener);
}
