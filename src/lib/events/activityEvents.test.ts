import { describe, expect, it, vi } from "vitest";
import { publishActivity, subscribeActivity } from "./activityEvents";

describe("activity events", () => {
  it("reaches only the user's own listeners until they unsubscribe", () => {
    const ana = vi.fn();
    const bruno = vi.fn();
    const stop = subscribeActivity("ana", ana);
    subscribeActivity("bruno", bruno);

    publishActivity("ana");
    publishActivity(null);
    stop();
    publishActivity("ana");

    expect(ana).toHaveBeenCalledTimes(1);
    expect(bruno).not.toHaveBeenCalled();
  });
});
