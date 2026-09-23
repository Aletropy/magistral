import { describe, expect, it, vi } from "vitest";
import { renderDocument } from "@/lib/export/renderDocument";
import type { StyleExtractor } from "@/lib/style/extractor";
import { NO_USAGE } from "@/lib/llm/types";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";
import { MAX_PERSONA_NAME_CHARS, MAX_TONE_PARAMETERS } from "@/lib/personas/schema";
import { captureStyle } from "./captureStyle";
import type { StyleExtraction } from "./styleProfileSchema";

const DOCUMENT = `# PARECER JURÍDICO Nº 12/2026

## I – RELATÓRIO

Trata-se de consulta formulada pela Secretaria Municipal de Fazenda acerca da incidência do ISS sobre serviços de hospedagem.

## II – FUNDAMENTAÇÃO

À luz do art. 156, inciso III, da Constituição Federal, compete ao Município instituir o imposto.

É o parecer, s.m.j.`;

const EXTRACTION: StyleExtraction = {
  profile: {
    structuralFramework: "Relatório e fundamentação.",
    sectionOrder: ["RELATÓRIO", "FUNDAMENTAÇÃO"],
    vocabularyComplexity: "alta",
    vocabularyNotes: "",
    sentenceLength: { averageWords: 22, shortPercent: 30, mediumPercent: 50, longPercent: 20, notes: "" },
    headerConventions: "Algarismos romanos.",
    headerExamples: ["I – RELATÓRIO"],
    citationFormatting: "art. 156, inciso III, da CF.",
    tone: "Técnico.",
    recurringExpressions: ["À luz do"],
    formattingRules: [],
  },
  suggestedName: "PGM - Parecer Tributário ".repeat(10),
  suggestedSystemInstruction: "Você é procurador municipal.",
  suggestedToneParameters: Array.from({ length: MAX_TONE_PARAMETERS + 3 }, (_, index) => `Regra ${index}.`),
  keyExcerpts: ["É o parecer, s.m.j.", "Trecho inventado que não está no documento."],
};

describe("captureStyle", () => {
  it("sends the document text, keeps only real excerpts and clips suggestions to persona limits", async () => {
    const extract = vi.fn<StyleExtractor>().mockResolvedValue({ extraction: EXTRACTION, model: "m", usage: NO_USAGE });
    const bytes = await renderDocument(parseMarkdown(DOCUMENT), "docx");

    const result = await captureStyle(extract, { name: "parecer.docx", bytes });

    expect(extract.mock.calls[0][0]).toContain("Trata-se de consulta formulada");
    expect(result.excerpts).toEqual(["É o parecer, s.m.j."]);
    expect(result.discardedExcerpts).toBe(1);
    expect(result.suggestedName.length).toBeLessThanOrEqual(MAX_PERSONA_NAME_CHARS);
    expect(result.suggestedToneParameters).toHaveLength(MAX_TONE_PARAMETERS);
    expect(result.fileName).toBe("parecer.docx");
  });
});
