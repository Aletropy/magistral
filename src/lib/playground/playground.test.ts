import { describe, expect, it, vi } from "vitest";
import { LlmOutputError } from "@/lib/llm/errors";
import { NO_USAGE, type MinutaGenerator } from "@/lib/llm/types";
import { DEFAULT_STYLE_SLIDERS } from "@/lib/personas/styleSliders";
import type { PersonaStyle } from "@/lib/personas/types";
import { buildPlaygroundPrompt } from "./buildPlaygroundPrompt";
import { rewriteSample } from "./rewriteSample";
import { DEFAULT_SAMPLE_TEXT, MAX_SAMPLE_TEXT_CHARS, playgroundRequestSchema } from "./schema";

const STYLE: PersonaStyle = {
  systemInstruction: "Você é procurador municipal.",
  toneParameters: ["Use voz ativa."],
  examples: [],
  negativeConstraints: ["outrossim"],
  styleSliders: { ...DEFAULT_STYLE_SLIDERS, length: 1 },
  styleProfile: null,
};

describe("buildPlaygroundPrompt", () => {
  it("keeps the persona sections, asks for a rewrite and wraps the sample in the user prompt", () => {
    const prompt = buildPlaygroundPrompt(STYLE, 0.3, "Texto base.");

    expect(prompt.system.split("\n")[0]).toBe(STYLE.systemInstruction);
    expect(prompt.system).toContain('"outrossim"');
    expect(prompt.system).toContain("Reescreva o texto de amostra");
    expect(prompt.system).not.toContain("testemunhas");
    expect(prompt.user).toBe("<texto_de_amostra>\nTexto base.\n</texto_de_amostra>");
    expect(prompt.temperature).toBe(0.3);
  });
});

describe("rewriteSample", () => {
  it("returns the trimmed rewrite and rejects an empty one", async () => {
    const generate = vi.fn<MinutaGenerator>();
    generate.mockResolvedValueOnce({ text: "  ## Encerramento\n\nTexto.\n", model: "m", usage: NO_USAGE });
    generate.mockResolvedValueOnce({ text: " ", model: "m", usage: NO_USAGE });

    await expect(rewriteSample(generate, STYLE, 0.3, "x")).resolves.toBe("## Encerramento\n\nTexto.");
    await expect(rewriteSample(generate, STYLE, 0.3, "x")).rejects.toEqual(new LlmOutputError("empty"));
  });
});

describe("playgroundRequestSchema", () => {
  const request = {
    personaId: "moderno",
    draft: { ...STYLE, temperature: 0.3 },
    sampleText: DEFAULT_SAMPLE_TEXT,
  };

  it("accepts the default sample and drops fields the playground doesn't edit", () => {
    const parsed = playgroundRequestSchema.parse(request);
    expect(parsed.draft).not.toHaveProperty("examples");
  });

  it("rejects an empty or oversized sample", () => {
    expect(playgroundRequestSchema.safeParse({ ...request, sampleText: "  " }).success).toBe(false);
    expect(
      playgroundRequestSchema.safeParse({ ...request, sampleText: "a".repeat(MAX_SAMPLE_TEXT_CHARS + 1) }).success,
    ).toBe(false);
  });
});
