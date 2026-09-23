import { describe, expect, it } from "vitest";
import { formatStyleProfile } from "./formatStyleProfile";
import { STYLE_EXTRACTION_JSON_SCHEMA, type StyleProfile } from "./styleProfileSchema";
import { verifyExcerpts } from "./verifyExcerpts";

const PROFILE: StyleProfile = {
  structuralFramework: "Ementa, relatório, fundamentação e conclusão.",
  sectionOrder: ["EMENTA", "RELATÓRIO", "FUNDAMENTAÇÃO", "CONCLUSÃO"],
  vocabularyComplexity: "alta",
  vocabularyNotes: "Jargão tributário.",
  sentenceLength: { averageWords: 27.6, shortPercent: 20, mediumPercent: 50, longPercent: 30, notes: "Períodos longos na fundamentação." },
  headerConventions: "Títulos em caixa alta, numerados com algarismos romanos.",
  headerExamples: ["I – RELATÓRIO"],
  citationFormatting: "Lei nº 5.172/1966, art. 150, inciso VI.",
  tone: "Técnico e assertivo.",
  recurringExpressions: ["à luz do exposto"],
  formattingRules: ["Termine com 'É o parecer, s.m.j.'"],
};

describe("formatStyleProfile", () => {
  it("renders every non-empty field as a line", () => {
    const lines = formatStyleProfile(PROFILE);
    expect(lines).toContain("Ordem das seções: EMENTA → RELATÓRIO → FUNDAMENTAÇÃO → CONCLUSÃO");
    expect(lines).toContain("Frases: média de 28 palavras (20% curtas, 50% médias, 30% longas). Períodos longos na fundamentação.");
    expect(lines).toContain('Expressões recorrentes: "à luz do exposto"');
    expect(lines.at(-1)).toBe("Termine com 'É o parecer, s.m.j.'");
  });

  it("skips empty lists", () => {
    const lines = formatStyleProfile({ ...PROFILE, sectionOrder: [], recurringExpressions: [], formattingRules: [] });
    expect(lines.some((line) => line.startsWith("Ordem das seções"))).toBe(false);
    expect(lines.some((line) => line.startsWith("Expressões recorrentes"))).toBe(false);
  });
});

describe("verifyExcerpts", () => {
  const SOURCE = `I – RELATÓRIO\n\nTrata-se de consulta\nsobre a “imunidade recíproca”.\n\nÉ o parecer, s.m.j.`;

  it("keeps excerpts found in the source despite line breaks, quotes, case and emphasis", () => {
    expect(verifyExcerpts(['Trata-se de consulta sobre a "imunidade **recíproca**".'], SOURCE, 500)).toHaveLength(1);
  });

  it("drops invented, empty or oversized excerpts", () => {
    expect(verifyExcerpts(["Trata-se de consulta sobre ISS.", "  "], SOURCE, 500)).toEqual([]);
    expect(verifyExcerpts(["É o parecer, s.m.j."], SOURCE, 5)).toEqual([]);
  });
});

describe("STYLE_EXTRACTION_JSON_SCHEMA", () => {
  it("is a self-contained object schema Gemini can use", () => {
    expect(STYLE_EXTRACTION_JSON_SCHEMA).toMatchObject({ type: "object" });
    expect(JSON.stringify(STYLE_EXTRACTION_JSON_SCHEMA)).not.toContain("$ref");
  });
});
