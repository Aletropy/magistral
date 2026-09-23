import { z } from "zod";
import { MAX_PERSONA_ID_CHARS, personaInputSchema } from "@/lib/personas/schema";

export const MAX_SAMPLE_TEXT_CHARS = 4000;

export const DEFAULT_SAMPLE_TEXT = `CLÁUSULA OITAVA – DA RESCISÃO

O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio por escrito de 30 (trinta) dias. Em caso de descumprimento de qualquer obrigação, a parte prejudicada poderá rescindir o contrato de imediato, ficando a parte infratora sujeita a multa de 10% (dez por cento) sobre o valor total do contrato, sem prejuízo de perdas e danos.`;

/** The persona fields the playground lets the user tune before saving. */
export const playgroundDraftSchema = personaInputSchema.pick({
  systemInstruction: true,
  toneParameters: true,
  temperature: true,
  negativeConstraints: true,
  styleSliders: true,
});

export const playgroundRequestSchema = z.object({
  personaId: z.string().trim().min(1).max(MAX_PERSONA_ID_CHARS),
  draft: playgroundDraftSchema,
  sampleText: z
    .string()
    .trim()
    .min(1, { error: "Cole um texto de amostra." })
    .max(MAX_SAMPLE_TEXT_CHARS, { error: `Use no máximo ${MAX_SAMPLE_TEXT_CHARS} caracteres.` }),
});

export type PlaygroundDraft = z.infer<typeof playgroundDraftSchema>;
export type PlaygroundRequest = z.infer<typeof playgroundRequestSchema>;
