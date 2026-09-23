import { describe, expect, it, vi } from "vitest";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { DEFAULT_STYLE_SLIDERS } from "@/lib/personas/styleSliders";
import type { Persona } from "@/lib/personas/types";
import { MinutaGenerationError } from "./errors";
import { generateMinuta } from "./generateMinuta";
import { NO_USAGE, type GenerationResult, type MinutaGenerator } from "./types";

function result(text: string): GenerationResult {
  return { text, model: "gemini-2.5-flash", usage: NO_USAGE };
}

const REQUEST: MinutaRequest = {
  documentType: "nda",
  customDocumentType: "",
  parties: [
    { name: "Acme Ltda.", role: "Reveladora", qualification: "" },
    { name: "Beta S.A.", role: "Receptora", qualification: "" },
  ],
  clauses: "",
  persona: "custom",
  useLibrary: false,
};

const PERSONA: Persona = {
  id: "custom",
  name: "PGM - Agressivo Tributário",
  description: "",
  systemInstruction: "Você é procurador municipal especializado em direito tributário.",
  toneParameters: ["Use voz ativa."],
  temperature: 0.2,
  examples: [],
  negativeConstraints: [],
  styleSliders: DEFAULT_STYLE_SLIDERS,
  styleProfile: null,
  isBuiltin: false,
  createdAt: "2026-09-23T00:00:00.000Z",
  updatedAt: "2026-09-23T00:00:00.000Z",
};

describe("generateMinuta", () => {
  it("sends the persona system prompt, its temperature and the request as the user prompt", async () => {
    const generate = vi.fn<MinutaGenerator>().mockResolvedValue(result("# ACORDO"));
    await generateMinuta(generate, REQUEST, PERSONA);

    const [{ system, user, temperature }] = generate.mock.calls[0];
    expect(system.startsWith(PERSONA.systemInstruction)).toBe(true);
    expect(user).toContain("Acme Ltda.");
    expect(temperature).toBe(PERSONA.temperature);
  });

  it("returns the trimmed Markdown", async () => {
    const generate: MinutaGenerator = async () => result("\n# ACORDO\n\nTexto.  ");
    await expect(generateMinuta(generate, REQUEST, PERSONA)).resolves.toBe("# ACORDO\n\nTexto.");
  });

  it("rejects an empty answer", async () => {
    const generate: MinutaGenerator = async () => result("   ");
    await expect(generateMinuta(generate, REQUEST, PERSONA)).rejects.toEqual(new MinutaGenerationError("empty"));
  });
});
