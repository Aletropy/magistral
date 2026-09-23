import { z } from "zod";

export const MAX_PERSONA_ID_CHARS = 64;
export const MAX_PERSONA_NAME_CHARS = 80;
export const MAX_PERSONA_DESCRIPTION_CHARS = 300;
export const MAX_SYSTEM_INSTRUCTION_CHARS = 2000;
export const MAX_TONE_PARAMETERS = 12;
export const MAX_TONE_PARAMETER_CHARS = 400;
export const MAX_EXAMPLES = 3;
export const MAX_EXAMPLE_CHARS = 4000;
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 1;
export const TEMPERATURE_STEP = 0.05;
export const DEFAULT_TEMPERATURE = 0.4;

export const personaInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Informe o nome da persona." })
    .max(MAX_PERSONA_NAME_CHARS, { error: `Use no máximo ${MAX_PERSONA_NAME_CHARS} caracteres.` }),
  description: z.string().trim().max(MAX_PERSONA_DESCRIPTION_CHARS, {
    error: `Use no máximo ${MAX_PERSONA_DESCRIPTION_CHARS} caracteres.`,
  }),
  systemInstruction: z
    .string()
    .trim()
    .min(1, { error: "Descreva quem a IA deve ser ao redigir." })
    .max(MAX_SYSTEM_INSTRUCTION_CHARS, {
      error: `Use no máximo ${MAX_SYSTEM_INSTRUCTION_CHARS} caracteres.`,
    }),
  toneParameters: z
    .array(
      z
        .string()
        .trim()
        .min(1, { error: "Preencha a regra ou remova-a." })
        .max(MAX_TONE_PARAMETER_CHARS, { error: `Use no máximo ${MAX_TONE_PARAMETER_CHARS} caracteres.` }),
    )
    .max(MAX_TONE_PARAMETERS, { error: `Use no máximo ${MAX_TONE_PARAMETERS} regras.` }),
  temperature: z
    .number({ error: "Informe a temperatura." })
    .min(TEMPERATURE_MIN, { error: `A temperatura mínima é ${TEMPERATURE_MIN}.` })
    .max(TEMPERATURE_MAX, { error: `A temperatura máxima é ${TEMPERATURE_MAX}.` }),
  examples: z
    .array(
      z
        .string()
        .trim()
        .min(1, { error: "Preencha o exemplo ou remova-o." })
        .max(MAX_EXAMPLE_CHARS, { error: `Use no máximo ${MAX_EXAMPLE_CHARS} caracteres.` }),
    )
    .max(MAX_EXAMPLES, { error: `Use no máximo ${MAX_EXAMPLES} exemplos.` }),
});

export type PersonaInput = z.infer<typeof personaInputSchema>;
export type PersonaFormValues = z.input<typeof personaInputSchema>;

export const EMPTY_PERSONA: PersonaFormValues = {
  name: "",
  description: "",
  systemInstruction: "",
  toneParameters: [],
  temperature: DEFAULT_TEMPERATURE,
  examples: [],
};
