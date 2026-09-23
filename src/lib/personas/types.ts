export interface Persona {
  id: string;
  name: string;
  description: string;
  /** First line of the system prompt: who the model is and how it writes. */
  systemInstruction: string;
  /** Strict writing rules, rendered as the prompt's tone section. */
  toneParameters: string[];
  /** Sampling temperature for providers that accept it (Gemini). */
  temperature: number;
  /** Few-shot samples showing tone only; the model must not copy their content. */
  examples: string[];
  /** Seeded personas can be edited but never deleted. */
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The persona fields that shape the system prompt. */
export type PersonaStyle = Pick<Persona, "systemInstruction" | "toneParameters" | "examples">;

/** What the minuta form needs to list a persona. */
export type PersonaSummary = Pick<Persona, "id" | "name" | "description">;
