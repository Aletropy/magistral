import { z } from "zod";
import { MAX_APPROVED_CLAUSES } from "@/lib/clauses/schema";
import { AppError } from "@/lib/errors/AppError";
import { HTTP_UNPROCESSABLE_CONTENT } from "@/lib/http/status";
import type { ToolCard } from "@/lib/chat/toolSteps";
import { DOCUMENT_TYPE_IDS } from "@/lib/minuta/documentTypes";
import { toReviewNotes, toSuggestedDraft, type SuggestedDraft, type SuggestionCatalog } from "@/lib/minuta/draftSuggestion";
import { MAX_PARTIES, minutaRequestSchema, type MinutaRequest } from "@/lib/minuta/schema";
import { resolveDocumentTypeLabel } from "@/lib/prompt/buildUserPrompt";

/**
 * What the assistant fills in for a minuta, in the words of the form: the same reading the "Preencher com
 * IA" button produces, plus whether to use the library. Clipped to the form's limits by toSuggestedDraft.
 */
export const minutaToolInputSchema = z.object({
  tipoDocumento: z.enum(DOCUMENT_TYPE_IDS),
  tipoPersonalizado: z.string().default("").describe("Só para tipoDocumento “outro”: o nome do documento."),
  partes: z
    .array(z.object({ nome: z.string(), papel: z.string(), qualificacao: z.string().default("") }))
    .max(MAX_PARTIES)
    .describe("Cada parte com o nome, o papel no contrato (ex.: Locador) e a qualificação que o usuário informou."),
  condicoes: z.array(z.string()).describe("As condições combinadas, uma por item (objeto, prazo, valor, multa, foro…)."),
  clausulasAprovadas: z.array(z.string()).max(MAX_APPROVED_CLAUSES).default([]).describe("Ids de listar_clausulas, na ordem desejada."),
  personaId: z.string().default("").describe("Id de listar_personas."),
  usarBiblioteca: z.boolean().default(true),
  pontosARevisar: z.array(z.string()).default([]).describe("O que o usuário deve conferir antes de gerar."),
});
export type MinutaToolInput = z.infer<typeof minutaToolInputSchema>;

/** The input as the form's suggestion: unknown clause and persona ids dropped, texts clipped. */
export function toDraft(input: MinutaToolInput, catalog: SuggestionCatalog): SuggestedDraft {
  return toSuggestedDraft(
    {
      documentType: input.tipoDocumento,
      customDocumentType: input.tipoPersonalizado,
      parties: input.partes.map((party) => ({ name: party.nome, role: party.papel, qualification: party.qualificacao })),
      clauses: input.condicoes,
      approvedClauseIds: input.clausulasAprovadas,
      personaId: input.personaId,
      reviewNotes: [],
    },
    catalog,
  );
}

export function reviewNotesOf(input: MinutaToolInput): string[] {
  return toReviewNotes(input.pontosARevisar);
}

const PERSONA_REQUIRED_MESSAGE = "Escolha a persona: use listar_personas e passe o personaId.";

/** The request to draft, checked like the form checks it; the first problem becomes the message. */
export function toMinutaRequest(input: MinutaToolInput, catalog: SuggestionCatalog): MinutaRequest {
  const draft = toDraft(input, catalog);
  if (!draft.persona) throw new AppError(HTTP_UNPROCESSABLE_CONTENT, PERSONA_REQUIRED_MESSAGE);
  const result = minutaRequestSchema.safeParse({ ...draft, persona: draft.persona, useLibrary: input.usarBiblioteca, baseDocument: null });
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new AppError(HTTP_UNPROCESSABLE_CONTENT, `Pedido de minuta incompleto (${issue.path.join(".")}): ${issue.message}`);
  }
  return result.data;
}

const NONE = "—";

/** The request as the confirmation card lists it. */
export function describeRequest(request: MinutaRequest, personaName: string, clauseTitles: string[]): ToolCard {
  return {
    type: "fields",
    title: resolveDocumentTypeLabel(request),
    rows: [
      { label: "Partes", value: request.parties.map((party) => `${party.name || NONE} (${party.role || NONE})`).join("; ") },
      { label: "Condições", value: request.clauses || NONE },
      { label: "Cláusulas aprovadas", value: clauseTitles.join("; ") || NONE },
      { label: "Persona", value: personaName },
      { label: "Biblioteca", value: request.useLibrary ? "Consultar" : "Não consultar" },
    ],
  };
}
