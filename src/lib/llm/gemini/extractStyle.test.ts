import { FinishReason, type GoogleGenAI } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { STYLE_EXTRACTION_JSON_SCHEMA, type StyleExtraction } from "@/lib/style/styleProfileSchema";
import { STYLE_EXTRACTION_MODEL } from "./config";
import { createGeminiStyleExtractor } from "./extractStyle";

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

const USAGE_METADATA = { promptTokenCount: 5000, candidatesTokenCount: 800, thoughtsTokenCount: 1200 };

function fakeClient(response: { text?: string; candidates?: { finishReason?: FinishReason }[] }) {
  const generateContent = vi.fn(() => Promise.resolve({ ...response, usageMetadata: USAGE_METADATA }));
  return { client: { models: { generateContent } } as unknown as GoogleGenAI, generateContent };
}

describe("createGeminiStyleExtractor", () => {
  it("requests JSON with the extraction schema and returns the parsed profile", async () => {
    const { client, generateContent } = fakeClient({
      text: JSON.stringify(EXTRACTION),
      candidates: [{ finishReason: FinishReason.STOP }],
    });

    const result = await createGeminiStyleExtractor(client)("Texto do documento.");

    expect(result).toEqual({
      extraction: EXTRACTION,
      model: STYLE_EXTRACTION_MODEL,
      usage: { inputTokens: 5000, outputTokens: 800, thinkingTokens: 1200 },
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: STYLE_EXTRACTION_MODEL,
        contents: expect.stringContaining("Texto do documento."),
        config: expect.objectContaining({
          responseMimeType: "application/json",
          responseJsonSchema: STYLE_EXTRACTION_JSON_SCHEMA,
        }),
      }),
    );
  });

  it.each([
    ["not JSON", "{profile:"],
    ["JSON missing fields", JSON.stringify({ suggestedName: "x" })],
  ])("rejects %s as invalid output, keeping the usage", async (_, text) => {
    const { client } = fakeClient({ text, candidates: [{ finishReason: FinishReason.STOP }] });
    await expect(createGeminiStyleExtractor(client)("Texto.")).rejects.toMatchObject({
      reason: "invalid_output",
      usage: { inputTokens: 5000 },
    });
  });

  it("treats a safety block as a refusal", async () => {
    const { client } = fakeClient({ text: "", candidates: [{ finishReason: FinishReason.SAFETY }] });
    await expect(createGeminiStyleExtractor(client)("Texto.")).rejects.toMatchObject({ reason: "refusal" });
  });
});
