import type { StyleProfile } from "@/lib/style/styleProfileSchema";
import type { StyleSliders } from "./styleSliders";

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
  /** Words and phrases the model must never use. */
  negativeConstraints: string[];
  /** Formality, aggressiveness and length levels; neutral levels add nothing to the prompt. */
  styleSliders: StyleSliders;
  /** Writing style extracted from a reference document by Style Capture, if any. */
  styleProfile: StyleProfile | null;
  /** Seeded personas can be edited but never deleted. */
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The persona fields that shape the system prompt. */
export type PersonaStyle = Pick<
  Persona,
  "systemInstruction" | "toneParameters" | "examples" | "negativeConstraints" | "styleSliders" | "styleProfile"
>;

/** What the minuta form needs to list a persona. */
export type PersonaSummary = Pick<Persona, "id" | "name" | "description">;
