import { describe, expect, it } from "vitest";
import { normalizeForMatch } from "./normalizeForMatch";

describe("normalizeForMatch", () => {
  it("lowercases and removes accents", () => {
    expect(normalizeForMatch("Posto Isto, AÇÃO É")).toBe("posto isto, acao e");
  });
});
