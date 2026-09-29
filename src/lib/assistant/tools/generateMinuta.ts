import { draftTaskPath } from "@/lib/minuta/paths";
import type { SuggestionCatalog } from "@/lib/minuta/draftSuggestion";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { resolveDocumentTypeLabel } from "@/lib/prompt/buildUserPrompt";
import { defineActionTool } from "../tool";
import { describeRequest, minutaToolInputSchema, toMinutaRequest } from "./minutaToolInput";

export interface GenerateMinutaDeps {
  catalog: () => SuggestionCatalog;
  /** Checks the persona, the clauses and the library as the draft route does; throws an AppError otherwise. */
  checkRequest: (request: MinutaRequest) => { personaName: string; clauseTitles: string[] };
  /** Queues the draft task for the user; resolves to its id. */
  enqueueDraft: (ownerId: string, request: MinutaRequest) => Promise<string>;
}

/** Drafts a minuta in the background. It spends AI quota, so the user confirms the request first. */
export function createGenerateMinutaTool({ catalog, checkRequest, enqueueDraft }: GenerateMinutaDeps) {
  function prepare(input: Parameters<typeof toMinutaRequest>[0]) {
    const request = toMinutaRequest(input, catalog());
    return { request, ...checkRequest(request) };
  }

  return defineActionTool({
    name: "gerar_minuta",
    description:
      "Gera a minuta completa em segundo plano com o gerador do Magistral (persona, cláusulas aprovadas e biblioteca). Gasta cota de IA, então o usuário confirma antes. Use só quando tipo, partes, condições e persona estiverem definidos; senão use preparar_minuta.",
    input: minutaToolInputSchema,
    progressLabel: "Preparando a geração da minuta",
    async propose(input) {
      const { request, personaName, clauseTitles } = prepare(input);
      return { summary: `Gerar ${resolveDocumentTypeLabel(request)}`, card: describeRequest(request, personaName, clauseTitles) };
    },
    async execute(input, _state, { ownerId }) {
      const { request } = prepare(input);
      const taskId = await enqueueDraft(ownerId, request);
      return {
        output: "A geração começou em segundo plano. O usuário recebe um aviso quando terminar, e a minuta fica no histórico.",
        summary: `Gerando ${resolveDocumentTypeLabel(request)}`,
        card: { type: "link", href: draftTaskPath(taskId), label: "Acompanhar a geração" },
      };
    },
  });
}
