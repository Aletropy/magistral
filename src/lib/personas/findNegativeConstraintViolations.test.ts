import { describe, expect, it } from "vitest";
import { findNegativeConstraintViolations } from "./findNegativeConstraintViolations";

describe("findNegativeConstraintViolations", () => {
  it("finds terms regardless of case and accents", () => {
    const text = "Outrossim, as partes acordam. DEBALDE foi a tentativa.";
    expect(findNegativeConstraintViolations(text, ["outrossim", "débalde", "posto isto"])).toEqual([
      "outrossim",
      "débalde",
    ]);
  });

  it("matches multi-word terms across line breaks and extra spaces", () => {
    expect(findNegativeConstraintViolations("Posto\n  isto, decide-se.", ["posto isto"])).toEqual(["posto isto"]);
  });

  it("ignores terms that only appear inside longer words", () => {
    expect(findNegativeConstraintViolations("A rescisão é imediata.", ["cisão"])).toEqual([]);
  });

  it("treats regex characters in terms literally", () => {
    expect(findNegativeConstraintViolations("Vide art. 5.", ["art."])).toEqual(["art."]);
    expect(findNegativeConstraintViolations("Vide arte", ["art."])).toEqual([]);
  });
});
