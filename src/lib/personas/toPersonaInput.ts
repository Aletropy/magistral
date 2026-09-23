import type { PersonaInput } from "./schema";
import type { Persona } from "./types";

/** The editable fields of a stored persona, as the forms and the update route expect them. */
export function toPersonaInput(persona: Persona): PersonaInput {
  return {
    name: persona.name,
    description: persona.description,
    systemInstruction: persona.systemInstruction,
    toneParameters: persona.toneParameters,
    temperature: persona.temperature,
    examples: persona.examples,
    negativeConstraints: persona.negativeConstraints,
    styleSliders: persona.styleSliders,
  };
}
