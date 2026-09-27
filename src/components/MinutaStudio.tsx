"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DraftSuggestionPanel } from "@/components/minuta/DraftSuggestionPanel";
import { ReviewNotes } from "@/components/minuta/ReviewNotes";
import { MinutaForm } from "@/components/MinutaForm";
import { ResultPanel } from "@/components/ResultPanel";
import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MinutaWizard } from "@/components/wizard/MinutaWizard";
import { useBackgroundTask } from "@/hooks/useBackgroundTask";
import { useLocalValue } from "@/hooks/useLocalValue";
import { useMinutaGeneration, type MinutaGenerationInitialState } from "@/hooks/useMinutaGeneration";
import { useReviewPersistence } from "@/hooks/useReviewPersistence";
import type { ClauseOption } from "@/lib/clauses/types";
import { DRAFT_SUGGESTIONS_ENDPOINT, postJson } from "@/lib/http/api";
import {
  applySuggestion,
  draftSuggestionResultSchema,
  type DraftSuggestionResult,
  type SuggestionCatalog,
} from "@/lib/minuta/draftSuggestion";
import { initialMinutaValues } from "@/lib/minuta/formDefaults";
import { DRAFT_SUGGESTION_QUERY_PARAM } from "@/lib/minuta/paths";
import type { MinutaFormValues, MinutaRequest } from "@/lib/minuta/schema";
import { minutaDraftStorageKey, parseStoredDraft, serializeDraft } from "@/lib/minuta/storedDraft";
import type { WizardStepId } from "@/lib/minuta/wizardSteps";
import { minutaPath } from "@/lib/minutas/paths";
import type { PersonaSummary } from "@/lib/personas/types";
import type { TaskDetail } from "@/lib/tasks/types";
import { formatDateTime } from "@/lib/usage/format";

const MODES = { wizard: "passo-a-passo", form: "completo" } as const;
type Mode = (typeof MODES)[keyof typeof MODES];
const MODE_STORAGE_KEY = "magistral-minuta-modo";
const SUGGESTION_FAILED = "Não foi possível enviar o documento para leitura. Tente novamente.";

interface MinutaStudioProps {
  /** Keys the unsent draft kept in this browser, which may be shared by the office. */
  userId: string;
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
  initialGeneration?: MinutaGenerationInitialState;
  /** A document reading the page was opened with (`?rascunho=`); once finished it is applied right away. */
  initialSuggestion?: TaskDetail | null;
}

interface InitialForm {
  values: MinutaFormValues;
  appliedSuggestionId: string | null;
  reviewNotes: string[];
}

function initialForm(personas: PersonaSummary[], catalog: SuggestionCatalog, suggestion: TaskDetail | null): InitialForm {
  const blank = initialMinutaValues(personas);
  const finished = suggestion?.status === "succeeded" ? draftSuggestionResultSchema.safeParse(suggestion.result) : null;
  if (!suggestion || !finished?.success) return { values: blank, appliedSuggestionId: null, reviewNotes: [] };
  return {
    values: applySuggestion(blank, finished.data, catalog),
    appliedSuggestionId: suggestion.id,
    reviewNotes: finished.data.reviewNotes,
  };
}

/** The minuta page: a guided wizard or the full form over the same values, and the background draft's result. */
export function MinutaStudio({
  userId,
  personas,
  clauses,
  librarySourceCount,
  initialGeneration,
  initialSuggestion = null,
}: MinutaStudioProps) {
  const catalog = useMemo(
    () => ({
      clauseIds: new Set(clauses.map((clause) => clause.id)),
      personaIds: new Set(personas.map((persona) => persona.id)),
    }),
    [clauses, personas],
  );
  const [start] = useState(() => initialForm(personas, catalog, initialSuggestion));
  const [values, setValues] = useState(start.values);
  const [appliedSuggestionId, setAppliedSuggestionId] = useState(start.appliedSuggestionId);
  const [reviewNotes, setReviewNotes] = useState(start.reviewNotes);
  const [wizard, setWizard] = useState<{ key: number; step: WizardStepId }>({
    key: 0,
    step: start.appliedSuggestionId ? "revisao" : "inicio",
  });
  const [hasEdited, setHasEdited] = useState(start.appliedSuggestionId !== null);
  const [storedMode, setStoredMode] = useLocalValue(MODE_STORAGE_KEY);
  const [storedDraftJson, setStoredDraftJson] = useLocalValue(minutaDraftStorageKey(userId));
  const storedDraft = hasEdited ? null : parseStoredDraft(storedDraftJson);
  const mode: Mode = initialSuggestion || storedMode !== MODES.form ? MODES.wizard : MODES.form;

  const suggestion = useBackgroundTask(draftSuggestionResultSchema, initialSuggestion, {
    queryParam: DRAFT_SUGGESTION_QUERY_PARAM,
  });
  const { background, result, isWorking, showTaskStatus, isLoadingResult, error, generate, replaceMarkdown } =
    useMinutaGeneration(initialGeneration);
  const { persist, saveError } = useReviewPersistence();
  const resultRef = useRef<HTMLDivElement>(null);
  const resultId = result?.id;

  // On phones the result sits below the long form; bring it into view once it arrives.
  useEffect(() => {
    if (resultId) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultId]);

  function changeValues(next: MinutaFormValues) {
    // A suggestion read from another document no longer matches the form.
    if (next.baseDocument !== values.baseDocument && suggestion.taskId) {
      suggestion.dismiss();
      setAppliedSuggestionId(null);
    }
    setValues(next);
    setHasEdited(true);
    setStoredDraftJson(serializeDraft(next, new Date()));
  }

  function resumeDraft() {
    if (!storedDraft) return;
    setValues({ ...storedDraft.values });
    setHasEdited(true);
    setWizard((previous) => ({ key: previous.key + 1, step: "revisao" }));
  }

  function startOver() {
    setValues(initialMinutaValues(personas));
    setReviewNotes([]);
    setAppliedSuggestionId(null);
    setStoredDraftJson(null);
    setHasEdited(true);
    suggestion.dismiss();
    setWizard((previous) => ({ key: previous.key + 1, step: "inicio" }));
  }

  function suggestFromDocument() {
    if (!values.baseDocument) return;
    const body = { source: "document", document: values.baseDocument };
    void suggestion.start(() => postJson(DRAFT_SUGGESTIONS_ENDPOINT, body), SUGGESTION_FAILED);
  }

  function applyDraftSuggestion(suggested: DraftSuggestionResult) {
    changeValues(applySuggestion(values, suggested, catalog));
    setAppliedSuggestionId(suggestion.taskId);
    setReviewNotes(suggested.reviewNotes);
    setWizard((previous) => ({ key: previous.key + 1, step: "revisao" }));
  }

  async function handleSubmit(request: MinutaRequest) {
    if (await generate(request)) setStoredDraftJson(null);
  }

  function handleReviewApplied(markdown: string) {
    replaceMarkdown(markdown);
    if (resultId) void persist(resultId, markdown);
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

  const hasOutput = showTaskStatus || result !== null || isLoadingResult || error !== null;
  const output = (
    <div ref={resultRef} className="flex scroll-mt-4 flex-col gap-3">
      {result && !isWorking && (
        <p className="text-sm text-muted-foreground">
          Salva no{" "}
          <Link href={minutaPath(result.id)} className="text-primary hover:underline">
            histórico
          </Link>
          . Revisões aplicadas também ficam salvas.
        </p>
      )}
      {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      {showTaskStatus ? (
        <>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <FollowedTaskStatus background={background} runningTitle="Redigindo a minuta" />
        </>
      ) : (
        <ResultPanel result={result} isLoading={isLoadingResult} error={error} onReviewApplied={handleReviewApplied} />
      )}
    </div>
  );

  return (
    <Tabs value={mode} onValueChange={(next) => setStoredMode(next)} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value={MODES.wizard}>Passo a passo</TabsTrigger>
          <TabsTrigger value={MODES.form}>Formulário completo</TabsTrigger>
        </TabsList>
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

      <TabsContent value={MODES.wizard} className="flex flex-col gap-8">
        <MinutaWizard
          key={wizard.key}
          initialStep={wizard.step}
          personas={personas}
          clauses={clauses}
          librarySourceCount={librarySourceCount}
          values={values}
          onValuesChange={changeValues}
          isSubmitting={background.isStarting}
          isBusy={isWorking}
          baseDocumentExtras={suggestionPanel}
          reviewNotes={reviewNotes}
          onSubmit={(request) => void handleSubmit(request)}
        />
        {hasOutput && output}
      </TabsContent>

      <TabsContent value={MODES.form}>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <ReviewNotes notes={reviewNotes} />
            <MinutaForm
              personas={personas}
              clauses={clauses}
              librarySourceCount={librarySourceCount}
              values={values}
              onValuesChange={changeValues}
              isSubmitting={background.isStarting}
              isBusy={isWorking}
              busyLabel="Gerando em segundo plano…"
              baseDocumentExtras={suggestionPanel}
              onSubmit={(request) => void handleSubmit(request)}
            />
          </div>
          {output}
        </div>
      </TabsContent>
    </Tabs>
  );
}
