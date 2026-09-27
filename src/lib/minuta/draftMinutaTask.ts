import "server-only";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { minutaPath } from "@/lib/minutas/paths";
import { draftTaskPath } from "./paths";
import { titleFromMarkdown } from "@/lib/minutas/titleFromMarkdown";
import { resolveDocumentTypeLabel } from "@/lib/prompt/buildUserPrompt";
import { taskOwner, type TaskHandler } from "@/lib/tasks/handler";
import { draftMinuta, type DraftStage } from "./draftMinuta";
import { draftTaskResultSchema, type DraftTaskResult } from "./draftTaskResult";
import { minutaRequestSchema, type MinutaRequest } from "./schema";

const DRAFT_STAGE_LABELS: Record<DraftStage, string> = {
  library: "Consultando a biblioteca",
  drafting: "Redigindo a minuta",
};
/** The stages as steps of a progress bar. */
const DRAFT_STAGE_STEP: Record<DraftStage, number> = { library: 0, drafting: 1 };
const DRAFT_STAGE_COUNT = 2;
const MAX_TITLE_PARTIES = 2;


/** "Contrato de Locação · Ana × Imobiliária Beta", naming the task before the minuta has a title. */
export function draftTaskTitle(request: MinutaRequest): string {
  const parties = request.parties.slice(0, MAX_TITLE_PARTIES).map((party) => party.name);
  return [resolveDocumentTypeLabel(request), parties.join(" × ")].filter(Boolean).join(" · ");
}

/** Drafts a minuta in the background and saves it to the history, in the same step that ends the task. */
export const draftMinutaTask: TaskHandler<MinutaRequest, DraftTaskResult> = {
  kind: "minuta.draft",
  lane: "llm",
  payloadSchema: minutaRequestSchema,
  resultSchema: draftTaskResultSchema,

  async run(context) {
    const { payload, signal, reportProgress, commit } = context;
    const ownerId = taskOwner(context);
    const { result, personaName } = await draftMinuta(payload, "minuta", {
      signal,
      onStage: (stage) => reportProgress(DRAFT_STAGE_STEP[stage], DRAFT_STAGE_COUNT, DRAFT_STAGE_LABELS[stage]),
    });
    const documentTypeLabel = resolveDocumentTypeLabel(payload);
    const title = titleFromMarkdown(result.markdown, documentTypeLabel);
    return commit(() => ({
      minutaId: getMinutaRepository().create({ ownerId, title, personaName, documentTypeLabel, request: payload, result }),
      title,
    }));
  },

  describeSuccess: (result) => ({
    level: "success",
    title: "Minuta pronta",
    body: result.title,
    href: minutaPath(result.minutaId),
  }),
  describeFailure: (message, task) => ({
    level: "error",
    title: "Não foi possível gerar a minuta",
    body: `${task.title}: ${message}`,
    // Back to the form with the failed task, where it can be retried.
    href: draftTaskPath(task.id),
  }),
};
