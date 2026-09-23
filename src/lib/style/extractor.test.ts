import { describe, expect, it, vi } from "vitest";
import type { StructuredGenerator } from "@/lib/llm/types";
import { createStyleExtractor, STYLE_EXTRACTION_TEMPERATURE } from "./extractor";
import { STYLE_EXTRACTION_JSON_SCHEMA, type StyleExtraction } from "./styleProfileSchema";

const EXTRACTION: StyleExtraction = {
  profile: {
    structuralFramework: "Cláusulas numeradas.",
    sectionOrder: [],
    vocabularyComplexity: "média",
    vocabularyNotes: "",
    sentenceLength: { averageWords: 18, shortPercent: 40, mediumPercent: 40, longPercent: 20, notes: "" },
    headerConventions: "Caixa alta.",
    headerExamples: [],
    citationFormatting: "nenhuma",
    tone: "Direto.",
    recurringExpressions: [],
    formattingRules: [],
  },
  suggestedName: "Contratos - Simples",
  suggestedSystemInstruction: "Você é um advogado.",
  suggestedToneParameters: [],
  keyExcerpts: [],
};
const USAGE = { inputTokens: 5000, outputTokens: 800, thinkingTokens: 1200 };

function generatorAnswering(text: string) {
  return vi.fn<StructuredGenerator>().mockResolvedValue({ text, model: "m", usage: USAGE });
}

describe("createStyleExtractor", () => {
  it("sends the document with the extraction schema and returns the parsed profile", async () => {
    const generate = generatorAnswering(JSON.stringify(EXTRACTION));
    const { signal } = new AbortController();

    await expect(createStyleExtractor(generate)("Texto do documento.", { signal })).resolves.toEqual({
      extraction: EXTRACTION,
      model: "m",
      usage: USAGE,
    });
    const [prompt, schema, options] = generate.mock.calls[0];
    expect(prompt.user).toContain("Texto do documento.");
    expect(prompt.temperature).toBe(STYLE_EXTRACTION_TEMPERATURE);
    expect(schema.schema).toBe(STYLE_EXTRACTION_JSON_SCHEMA);
    expect(options).toEqual({ signal });
  });

  it.each([
    ["not JSON", "{profile:"],
    ["JSON missing fields", JSON.stringify({ suggestedName: "x" })],
  ])("rejects %s as invalid output, keeping the usage", async (_, text) => {
    await expect(createStyleExtractor(generatorAnswering(text))("Texto.")).rejects.toMatchObject({
      reason: "invalid_output",
      usage: USAGE,
    });
  });
});
