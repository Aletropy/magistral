import { describe, expect, it } from "vitest";
import { MAX_EXAMPLES, MAX_TONE_PARAMETERS, TEMPERATURE_MAX, personaInputSchema } from "./schema";
import { BUILTIN_PERSONAS } from "./seeds";

const [VALID] = BUILTIN_PERSONAS;

describe("personaInputSchema", () => {
  it("accepts every built-in persona", () => {
    for (const persona of BUILTIN_PERSONAS) {
      expect(personaInputSchema.safeParse(persona).success).toBe(true);
    }
  });

  it("requires a name and a system instruction", () => {
    expect(personaInputSchema.safeParse({ ...VALID, name: "  " }).success).toBe(false);
    expect(personaInputSchema.safeParse({ ...VALID, systemInstruction: "" }).success).toBe(false);
  });

  it("keeps the temperature within range", () => {
    expect(personaInputSchema.safeParse({ ...VALID, temperature: TEMPERATURE_MAX + 0.1 }).success).toBe(false);
    expect(personaInputSchema.safeParse({ ...VALID, temperature: -0.1 }).success).toBe(false);
  });

  it("caps the number of tone parameters and examples", () => {
    const tooManyRules = Array.from({ length: MAX_TONE_PARAMETERS + 1 }, () => "Regra.");
    const tooManyExamples = Array.from({ length: MAX_EXAMPLES + 1 }, () => "Exemplo.");
    expect(personaInputSchema.safeParse({ ...VALID, toneParameters: tooManyRules }).success).toBe(false);
    expect(personaInputSchema.safeParse({ ...VALID, examples: tooManyExamples }).success).toBe(false);
  });

  it("rejects blank rules and examples", () => {
    expect(personaInputSchema.safeParse({ ...VALID, toneParameters: [" "] }).success).toBe(false);
    expect(personaInputSchema.safeParse({ ...VALID, examples: [""] }).success).toBe(false);
  });
});
