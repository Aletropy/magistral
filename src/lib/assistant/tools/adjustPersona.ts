import { z } from "zod";
import { AppError } from "@/lib/errors/AppError";
import { HTTP_CONFLICT, HTTP_NOT_FOUND, HTTP_UNPROCESSABLE_CONTENT } from "@/lib/http/status";
import { personaEditPath } from "@/lib/personas/paths";
import type { PersonaRepository } from "@/lib/personas/repository";
import { personaInputSchema, TEMPERATURE_MAX, TEMPERATURE_MIN, type PersonaInput } from "@/lib/personas/schema";
import { STYLE_SLIDER_MAX, STYLE_SLIDER_MIN } from "@/lib/personas/styleSliders";
import { toPersonaInput } from "@/lib/personas/toPersonaInput";
import type { Persona } from "@/lib/personas/types";
import { fingerprint } from "../fingerprint";
import { defineActionTool } from "../tool";

const MAX_ID_CHARS = 64;
const PERSONA_NOT_FOUND_MESSAGE = "Persona não encontrada. Use listar_personas para ver os ids.";
const NO_CHANGE_MESSAGE = "Nenhum campo muda. Informe só o que deve ser alterado.";
const CHANGED_MESSAGE = "A persona mudou depois que o ajuste foi proposto. Peça o ajuste de novo.";
const LIST_SEPARATOR = "; ";

const sliderSchema = z.number().int().min(STYLE_SLIDER_MIN).max(STYLE_SLIDER_MAX);

const adjustInputSchema = z.object({
  personaId: z.string().trim().min(1).max(MAX_ID_CHARS),
  nome: z.string().optional(),
  descricao: z.string().optional(),
  instrucao: z.string().optional().describe("A instrução principal: quem o redator é e como escreve."),
  parametrosDeTom: z.array(z.string()).optional().describe("A lista completa de regras de escrita, já com as mudanças."),
  termosProibidos: z.array(z.string()).optional().describe("A lista completa de termos proibidos, já com as mudanças."),
  formalidade: sliderSchema.optional(),
  firmeza: sliderSchema.optional(),
  extensao: sliderSchema.optional(),
  temperatura: z.number().min(TEMPERATURE_MIN).max(TEMPERATURE_MAX).optional(),
});
type AdjustInput = z.infer<typeof adjustInputSchema>;

const adjustStateSchema = z.object({ fingerprint: z.string() });

function merge(current: PersonaInput, input: AdjustInput): PersonaInput {
  const result = personaInputSchema.safeParse({
    ...current,
    name: input.nome ?? current.name,
    description: input.descricao ?? current.description,
    systemInstruction: input.instrucao ?? current.systemInstruction,
    toneParameters: input.parametrosDeTom ?? current.toneParameters,
    negativeConstraints: input.termosProibidos ?? current.negativeConstraints,
    temperature: input.temperatura ?? current.temperature,
    styleSliders: {
      formality: input.formalidade ?? current.styleSliders.formality,
      aggressiveness: input.firmeza ?? current.styleSliders.aggressiveness,
      length: input.extensao ?? current.styleSliders.length,
    },
  });
  if (!result.success) throw new AppError(HTTP_UNPROCESSABLE_CONTENT, result.error.issues[0].message);
  return result.data;
}

/** The fields the card compares, in the words of the persona editor. */
const FIELDS: { label: string; read: (persona: PersonaInput) => string }[] = [
  { label: "Nome", read: (persona) => persona.name },
  { label: "Descrição", read: (persona) => persona.description },
  { label: "Instrução", read: (persona) => persona.systemInstruction },
  { label: "Regras de tom", read: (persona) => persona.toneParameters.join(LIST_SEPARATOR) },
  { label: "Termos proibidos", read: (persona) => persona.negativeConstraints.join(LIST_SEPARATOR) },
  { label: "Formalidade", read: (persona) => String(persona.styleSliders.formality) },
  { label: "Firmeza", read: (persona) => String(persona.styleSliders.aggressiveness) },
  { label: "Extensão", read: (persona) => String(persona.styleSliders.length) },
  { label: "Criatividade", read: (persona) => String(persona.temperature) },
];

function changedRows(before: PersonaInput, after: PersonaInput) {
  return FIELDS.flatMap(({ label, read }) => {
    const [from, to] = [read(before), read(after)];
    return from === to ? [] : [{ label, value: `${from || "—"} → ${to || "—"}` }];
  });
}

/** Changes a shared persona's tone. Everyone's next minutas use it, so the user confirms the changes. */
export function createAdjustPersonaTool({ personas }: { personas: PersonaRepository }) {
  function load(id: string): Persona {
    const persona = personas.get(id);
    if (!persona) throw new AppError(HTTP_NOT_FOUND, PERSONA_NOT_FOUND_MESSAGE);
    return persona;
  }

  return defineActionTool({
    name: "ajustar_persona",
    description:
      "Ajusta uma persona existente (nome, descrição, instrução, regras de tom, termos proibidos, formalidade, firmeza e extensão de 1 a 5, criatividade de 0 a 1). Informe só os campos que mudam. A persona é do escritório inteiro, então o usuário confirma antes.",
    input: adjustInputSchema,
    progressLabel: "Preparando o ajuste da persona",
    async propose(input) {
      const persona = load(input.personaId);
      const before = toPersonaInput(persona);
      const rows = changedRows(before, merge(before, input));
      if (rows.length === 0) throw new AppError(HTTP_UNPROCESSABLE_CONTENT, NO_CHANGE_MESSAGE);
      return {
        summary: `Ajustar a persona “${persona.name}”`,
        card: { type: "fields", title: persona.name, rows },
        state: { fingerprint: fingerprint(before) },
      };
    },
    async execute(input, state) {
      const persona = load(input.personaId);
      const current = toPersonaInput(persona);
      if (adjustStateSchema.parse(state).fingerprint !== fingerprint(current)) throw new AppError(HTTP_CONFLICT, CHANGED_MESSAGE);
      const updated = personas.update(persona.id, merge(current, input));
      if (!updated) throw new AppError(HTTP_NOT_FOUND, PERSONA_NOT_FOUND_MESSAGE);
      return {
        output: `A persona “${updated.name}” foi ajustada.`,
        summary: `Persona “${updated.name}” ajustada`,
        card: { type: "link", href: personaEditPath(updated.id), label: "Abrir a persona" },
      };
    },
  });
}
