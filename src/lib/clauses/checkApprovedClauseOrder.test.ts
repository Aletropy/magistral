import { describe, expect, it } from "vitest";
import { isApprovedClauseOrderKept } from "./checkApprovedClauseOrder";

const MINUTA = `# CONTRATO

## 1. Objeto

## 2. Multa por Atraso no Aluguel

## 3. Foro`;

describe("isApprovedClauseOrderKept", () => {
  it("accepts the chosen order, matching headings regardless of numbering, case and accents", () => {
    expect(isApprovedClauseOrderKept(MINUTA, ["multa por atraso no aluguel", "Fóro"])).toBe(true);
  });

  it("flags approved clauses that came out in another order", () => {
    expect(isApprovedClauseOrderKept(MINUTA, ["Foro", "Multa por atraso no aluguel"])).toBe(false);
  });

  it("ignores clauses whose heading can't be found", () => {
    expect(isApprovedClauseOrderKept(MINUTA, ["Confidencialidade", "Foro"])).toBe(true);
  });
});
