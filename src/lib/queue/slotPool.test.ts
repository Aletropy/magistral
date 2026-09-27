import { describe, expect, it, vi } from "vitest";
import { createSlotPool } from "./slotPool";

describe("createSlotPool", () => {
  it("grants at most the free slots and tells listeners when one is released", () => {
    const pool = createSlotPool(2);
    const listener = vi.fn();
    pool.onRelease(listener);

    expect(pool.tryAcquire(3)).toBe(2);
    expect(pool.tryAcquire(1)).toBe(0);
    pool.release();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(pool.available()).toBe(1);
    pool.release(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
