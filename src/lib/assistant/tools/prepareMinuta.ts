import type { SuggestionCatalog } from "@/lib/minuta/draftSuggestion";
import { draftSuggestionResultSchema } from "@/lib/minuta/draftSuggestion";
import { draftSuggestionPath } from "@/lib/minuta/paths";
import type { TaskRepository } from "@/lib/tasks/repository";
import { resolveDocumentTypeLabel } from "@/lib/prompt/buildUserPrompt";
import { defineReadTool } from "../tool";
import { minutaToolInputSchema, reviewNotesOf, toDraft } from "./minutaToolInput";

const SOURCE_NAME = "Conversa com o Advogado IA";
const OPEN_LABEL = "Abrir o passo a passo preenchido";

export interface PrepareMinutaDeps {
  tasks: TaskRepository;
  catalog: () => SuggestionCatalog;
  now?: () => Date;
}

/**
 * Fills the minuta wizard from the conversation. Nothing is spent: the user opens the form, reviews it and
 * generates it there, so this runs without confirmation.
 */
export function createPrepareMinutaTool({ tasks, catalog, now = () => new Date() }: PrepareMinutaDeps) {
  return defineReadTool({
    name: "preparar_minuta",
    description:
      "Preenche o passo a passo de nova minuta com o que foi combinado na conversa e mostra um botão para o usuário abrir, revisar e gerar. Não gasta cota. Prefira esta ferramenta quando ainda faltar algo ou quando o usuário quiser revisar antes de gerar.",
    input: minutaToolInputSchema,
    progressLabel: "Preenchendo o formulário da minuta",
    async run(input, { ownerId }) {
      const draft = toDraft(input, catalog());
      const result = draftSuggestionResultSchema.parse({
        source: "conversation",
        sourceName: SOURCE_NAME,
        draft,
        reviewNotes: reviewNotesOf(input),
        baseDocument: null,
      });
      const label = resolveDocumentTypeLabel(draft);
      const taskId = tasks.createFinished(
        { ownerId, kind: "minuta.extract", lane: "llm", title: `${label} preparada pelo Advogado IA`, result },
        now(),
      );
      return {
        output: "O formulário foi preenchido. O usuário vê um botão para abri-lo; ele revisa os campos e gera a minuta por lá.",
        summary: `Preenchi o passo a passo: ${label}`,
        card: { type: "link", href: draftSuggestionPath(taskId), label: OPEN_LABEL },
      };
    },
  });
}
