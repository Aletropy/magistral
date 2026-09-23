import { describe, expect, it } from "vitest";
import { isApprovedClauseOrderKept, locateClauseSections, replaceSectionBody } from "./locateClauseSections";

const MINUTA = `# CONTRATO

## 1. Objeto

Locação do imóvel.

## 2. Multa por Atraso no Aluguel

Multa de 7% sobre o valor devido.

### Parágrafo único

Após 5 dias de tolerância.

## 3. Foro

Foro de Canoas/RS.`;

describe("locateClauseSections", () => {
  it("finds each clause's section by heading, including its subsections, regardless of numbering and accents", () => {
    const [multa, foro, missing] = locateClauseSections(MINUTA, ["multa por atraso no aluguel", "Fóro", "Sigilo"]);

    expect(multa?.heading).toBe("2. Multa por Atraso no Aluguel");
    expect(multa?.body).toBe("Multa de 7% sobre o valor devido.\n\n### Parágrafo único\n\nApós 5 dias de tolerância.");
    expect(foro?.body).toBe("Foro de Canoas/RS.");
    expect(missing).toBeNull();
  });

  it("replaces only the located section body", () => {
    const [foro] = locateClauseSections(MINUTA, ["Foro"]);
    const updated = replaceSectionBody(MINUTA, foro!, "Foro de Porto Alegre/RS.");
    expect(updated).toBe(MINUTA.replace("Foro de Canoas/RS.", "Foro de Porto Alegre/RS."));
  });
});

describe("isApprovedClauseOrderKept", () => {
  it("accepts the chosen order and flags a different one, ignoring clauses it can't find", () => {
    expect(isApprovedClauseOrderKept(MINUTA, ["Multa por atraso no aluguel", "Foro"])).toBe(true);
    expect(isApprovedClauseOrderKept(MINUTA, ["Foro", "Multa por atraso no aluguel"])).toBe(false);
    expect(isApprovedClauseOrderKept(MINUTA, ["Sigilo", "Foro"])).toBe(true);
  });
});
