import { describe, expect, it } from "vitest";
import { plural } from "./plural";

describe("plural", () => {
  it("picks the singular only for exactly one, and formats the count in pt-BR", () => {
    expect(plural(1, "alteração", "alterações")).toBe("1 alteração");
    expect(plural(0, "alteração", "alterações")).toBe("0 alterações");
    expect(plural(1200, "trecho", "trechos")).toBe("1.200 trechos");
  });
});
