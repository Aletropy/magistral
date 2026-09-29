import { describe, expect, it } from "vitest";
import { startOfBrasiliaDay } from "./brasiliaDay";

describe("startOfBrasiliaDay", () => {
  it("starts the day at 03:00 UTC, including just after midnight UTC", () => {
    expect(startOfBrasiliaDay(new Date("2026-09-29T15:00:00Z")).toISOString()).toBe("2026-09-29T03:00:00.000Z");
    expect(startOfBrasiliaDay(new Date("2026-09-30T01:30:00Z")).toISOString()).toBe("2026-09-29T03:00:00.000Z");
    expect(startOfBrasiliaDay(new Date("2026-09-30T03:00:00Z")).toISOString()).toBe("2026-09-30T03:00:00.000Z");
  });
});
