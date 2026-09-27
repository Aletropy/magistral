/**
 * A counting semaphore for work that shares one limit across workers, e.g. concurrent calls to the LLM
 * provider made by background tasks and batch items. Releasing a slot tells every listener, so a waiting
 * worker can claim work right away instead of at its next poll.
 */
export interface SlotPool {
  /** Takes up to `wanted` free slots; returns how many it got. */
  tryAcquire(wanted: number): number;
  release(count?: number): void;
  available(): number;
  onRelease(listener: () => void): () => void;
}

export function createSlotPool(capacity: number): SlotPool {
  let inUse = 0;
  const listeners = new Set<() => void>();
  return {
    tryAcquire(wanted) {
      const granted = Math.max(0, Math.min(wanted, capacity - inUse));
      inUse += granted;
      return granted;
    },
    release(count = 1) {
      if (count <= 0) return;
      inUse = Math.max(0, inUse - count);
      for (const listener of listeners) listener();
    },
    available: () => capacity - inUse,
    onRelease(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Concurrent LLM calls across the task and batch workers: free models are slow and rate limited, so more
 * than two at once mostly produces 429s.
 */
export const LLM_CONCURRENCY = 2;

const globalForSlots = globalThis as typeof globalThis & { magistralLlmSlots?: SlotPool };

/** The process-wide pool both workers draw LLM slots from (kept on globalThis across dev reloads). */
export function getLlmSlots(): SlotPool {
  globalForSlots.magistralLlmSlots ??= createSlotPool(LLM_CONCURRENCY);
  return globalForSlots.magistralLlmSlots;
}
