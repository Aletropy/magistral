"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DraftSuggestionPanel } from "@/components/minuta/DraftSuggestionPanel";
import { MinutaSummary } from "@/components/minuta/MinutaSummary";
import { ReviewNotes } from "@/components/minuta/ReviewNotes";
import { MinutaForm } from "@/components/MinutaForm";
import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { Button } from "@/components/ui/button";
import { MinutaWizard } from "@/components/wizard/MinutaWizard";
import { useBackgroundTask } from "@/hooks/useBackgroundTask";
import { useLocalValue } from "@/hooks/useLocalValue";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useMinutaGeneration } from "@/hooks/useMinutaGeneration";
import type { ClauseOption } from "@/lib/clauses/types";
import { postJson } from "@/lib/http/client";
import { DRAFT_SUGGESTIONS_ENDPOINT } from "@/lib/http/endpoints";
import {
  applySuggestion,
  draftSuggestionResultSchema,
  type DraftSuggestionResult,
  type SuggestionCatalog,
} from "@/lib/minuta/draftSuggestion";
import {
  EMPTY_CONDITIONS,
  buildClausesFromConditions,
  conditionsFromClauses,
  type WizardConditions,
} from "@/lib/minuta/conditions";
import { initialMinutaValues } from "@/lib/minuta/formDefaults";
import { DRAFT_SUGGESTION_QUERY_PARAM } from "@/lib/minuta/paths";
import type { MinutaFormValues, MinutaRequest } from "@/lib/minuta/schema";
import { minutaDraftStorageKey, parseStoredDraft, serializeDraft } from "@/lib/minuta/storedDraft";
import type { WizardStepId } from "@/lib/minuta/wizardSteps";
import { NEW_MINUTA_ADVANCED_PATH, NEW_MINUTA_PATH, minutaPath } from "@/lib/minutas/paths";
import type { PersonaSummary } from "@/lib/personas/types";
import type { TaskDetail } from "@/lib/tasks/types";
import { formatDateTime } from "@/lib/usage/format";

/** The guided wizard (its own focused page) or every field on one page (the advanced mode). */
export type StudioLayout = "steps" | "all";
const SUGGESTION_FAILED = "Não foi possível enviar o documento para leitura. Tente novamente.";

interface MinutaStudioProps {
  /** Keys the unsent draft kept in this browser, which may be shared by the office. */
  userId: string;
  layout: StudioLayout;
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
  /** A draft task the page was opened with (`?tarefa=`) that hasn't finished. */
  initialTask?: TaskDetail | null;
  /** A document reading the page was opened with (`?rascunho=`); once finished it is applied right away. */
  initialSuggestion?: TaskDetail | null;
}

interface InitialForm {
  values: MinutaFormValues;
  conditions: WizardConditions;
  appliedSuggestionId: string | null;
  reviewNotes: string[];
}

function initialForm(personas: PersonaSummary[], catalog: SuggestionCatalog, suggestion: TaskDetail | null): InitialForm {
  const blank = initialMinutaValues(personas);
  const finished = suggestion?.status === "succeeded" ? draftSuggestionResultSchema.safeParse(suggestion.result) : null;
  if (!suggestion || !finished?.success) {
    return { values: blank, conditions: EMPTY_CONDITIONS, appliedSuggestionId: null, reviewNotes: [] };
  }
  const values = applySuggestion(blank, finished.data, catalog);
  return {
    values,
    conditions: conditionsFromClauses(values.clauses),
    appliedSuggestionId: suggestion.id,
    reviewNotes: finished.data.reviewNotes,
  };
}

/**
 * The minuta workspace: the same values filled step by step or all at once, the draft's progress while it
 * is written in the background, and the saved minuta's review page once it is ready.
 */
export function MinutaStudio({
  userId,
  layout,
  personas,
  clauses,
  librarySourceCount,
  initialTask = null,
  initialSuggestion = null,
}: MinutaStudioProps) {
  const router = useRouter();
  const catalog = useMemo(
    () => ({
      clauseIds: new Set(clauses.map((clause) => clause.id)),
      personaIds: new Set(personas.map((persona) => persona.id)),
    }),
    [clauses, personas],
  );
  const [start] = useState(() => initialForm(personas, catalog, initialSuggestion));
  const [values, setValues] = useState(start.values);
  const [conditions, setConditions] = useState(start.conditions);
  const [appliedSuggestionId, setAppliedSuggestionId] = useState(start.appliedSuggestionId);
  const [reviewNotes, setReviewNotes] = useState(start.reviewNotes);
  const [wizard, setWizard] = useState<{ key: number; step: WizardStepId }>({
    key: 0,
    step: start.appliedSuggestionId ? "revisao" : "tipo",
  });
  const [hasEdited, setHasEdited] = useState(start.appliedSuggestionId !== null);
  const [storedDraftJson, setStoredDraftJson] = useLocalValue(minutaDraftStorageKey(userId));
  const storedDraft = hasEdited ? null : parseStoredDraft(storedDraftJson);

  const suggestion = useBackgroundTask(draftSuggestionResultSchema, initialSuggestion, {
    queryParam: DRAFT_SUGGESTION_QUERY_PARAM,
  });
  const { background, generate, minutaId } = useMinutaGeneration(initialTask);
  const isGenerating = background.isBusy;
  // The draft is kept in this browser, but closing the tab mid-way still deserves a warning.
  useUnsavedChangesWarning(hasEdited && !isGenerating && minutaId === null);

  // The minuta is saved in the history: review it there, where it can be downloaded and discussed.
  useEffect(() => {
    if (minutaId) router.push(minutaPath(minutaId));
  }, [minutaId, router]);

  function save(nextValues: MinutaFormValues, nextConditions: WizardConditions) {
    setValues(nextValues);
    setConditions(nextConditions);
    setHasEdited(true);
    setStoredDraftJson(serializeDraft(nextValues, new Date(), nextConditions));
  }

  function changeValues(next: MinutaFormValues) {
    // A suggestion read from another document no longer matches the form.
    if (next.baseDocument !== values.baseDocument && suggestion.taskId) {
      suggestion.dismiss();
      setAppliedSuggestionId(null);
    }
    if (layout === "all") {
      // The full form edits the clauses text directly; the wizard picks it up as "other conditions".
      save(next, next.clauses === values.clauses ? conditions : conditionsFromClauses(next.clauses));
      return;
    }
    // The wizard's answers depend on the type's questions, so the text follows a type change too.
    save({ ...next, clauses: buildClausesFromConditions(next.documentType, conditions) }, conditions);
  }

  function changeConditions(next: WizardConditions) {
    save({ ...values, clauses: buildClausesFromConditions(values.documentType, next) }, next);
  }

  function resumeDraft() {
    if (!storedDraft) return;
    setValues({ ...storedDraft.values });
    setConditions(storedDraft.conditions ?? conditionsFromClauses(storedDraft.values.clauses));
    setHasEdited(true);
    setWizard((previous) => ({ key: previous.key + 1, step: "revisao" }));
  }

  function startOver() {
    setValues(initialMinutaValues(personas));
    setConditions(EMPTY_CONDITIONS);
    setReviewNotes([]);
    setAppliedSuggestionId(null);
    setStoredDraftJson(null);
    setHasEdited(true);
    suggestion.dismiss();
    setWizard((previous) => ({ key: previous.key + 1, step: "tipo" }));
  }

  function suggestFromDocument() {
    if (!values.baseDocument) return;
    const body = { source: "document", document: values.baseDocument };
    void suggestion.start(() => postJson(DRAFT_SUGGESTIONS_ENDPOINT, body), SUGGESTION_FAILED);
  }

  function applyDraftSuggestion(suggested: DraftSuggestionResult) {
    const applied = applySuggestion(values, suggested, catalog);
    save(applied, conditionsFromClauses(applied.clauses));
    setAppliedSuggestionId(suggestion.taskId);
    setReviewNotes(suggested.reviewNotes);
    setWizard((previous) => ({ key: previous.key + 1, step: "revisao" }));
  }

  async function handleSubmit(request: MinutaRequest) {
    if (await generate(request)) setStoredDraftJson(null);
  }

  const suggestionPanel = (
    <DraftSuggestionPanel
      suggestion={suggestion}
      applied={appliedSuggestionId !== null && appliedSuggestionId === suggestion.taskId}
      disabled={background.isStarting}
      onSuggest={suggestFromDocument}
      onApply={applyDraftSuggestion}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {layout === "steps" ? (
          <Link href={NEW_MINUTA_ADVANCED_PATH} className="text-sm text-muted-foreground hover:text-primary hover:underline">
            Modo avançado: todos os campos numa página
          </Link>
        ) : (
          <Link href={NEW_MINUTA_PATH} className="text-sm text-muted-foreground hover:text-primary hover:underline">
            Voltar ao passo a passo
          </Link>
        )}
        {hasEdited && (
          <Button type="button" variant="ghost" size="sm" onClick={startOver}>
            Recomeçar do zero
          </Button>
        )}
      </div>

      {storedDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm" role="status">
          <span>Há um rascunho salvo neste navegador em {formatDateTime(storedDraft.savedAt)}.</span>
          <span className="flex gap-2">
            <Button type="button" size="sm" onClick={resumeDraft}>
              Continuar rascunho
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setStoredDraftJson(null)}>
              Descartar
            </Button>
          </span>
        </div>
      )}

      {background.startError && (
        <p role="alert" className="text-sm text-destructive">
          {background.startError}
        </p>
      )}
      <FollowedTaskStatus background={background} runningTitle="Redigindo a minuta" />

      {layout === "steps" ? (
        <MinutaWizard
          key={wizard.key}
          initialStep={wizard.step}
          personas={personas}
          clauses={clauses}
          librarySourceCount={librarySourceCount}
          values={values}
          onValuesChange={changeValues}
          conditions={conditions}
          onConditionsChange={changeConditions}
          isSubmitting={background.isStarting}
          isBusy={isGenerating}
          baseDocumentExtras={suggestionPanel}
          reviewNotes={reviewNotes}
          onSubmit={(request) => void handleSubmit(request)}
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex flex-col gap-4">
            <ReviewNotes notes={reviewNotes} />
            <MinutaForm
              personas={personas}
              clauses={clauses}
              librarySourceCount={librarySourceCount}
              values={values}
              onValuesChange={changeValues}
              isSubmitting={background.isStarting}
              isBusy={isGenerating}
              busyLabel="Gerando em segundo plano…"
              baseDocumentExtras={suggestionPanel}
              onSubmit={(request) => void handleSubmit(request)}
            />
          </div>
          <div className="lg:sticky lg:top-20">
            <MinutaSummary values={values} personas={personas} clauses={clauses} librarySourceCount={librarySourceCount} />
          </div>
        </div>
      )}
    </div>
  );
}
