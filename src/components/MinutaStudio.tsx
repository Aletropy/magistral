"use client";

import { ListChecks, Rows3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DraftSuggestionPanel } from "@/components/minuta/DraftSuggestionPanel";
import { MinutaSummary } from "@/components/minuta/MinutaSummary";
import { ReviewNotes } from "@/components/minuta/ReviewNotes";
import { MinutaForm } from "@/components/MinutaForm";
import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MinutaWizard } from "@/components/wizard/MinutaWizard";
import { useBackgroundTask } from "@/hooks/useBackgroundTask";
import { useLocalValue } from "@/hooks/useLocalValue";
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
import { initialMinutaValues } from "@/lib/minuta/formDefaults";
import { DRAFT_SUGGESTION_QUERY_PARAM } from "@/lib/minuta/paths";
import type { MinutaFormValues, MinutaRequest } from "@/lib/minuta/schema";
import { minutaDraftStorageKey, parseStoredDraft, serializeDraft } from "@/lib/minuta/storedDraft";
import type { WizardStepId } from "@/lib/minuta/wizardSteps";
import { minutaPath } from "@/lib/minutas/paths";
import type { PersonaSummary } from "@/lib/personas/types";
import type { TaskDetail } from "@/lib/tasks/types";
import { formatDateTime } from "@/lib/usage/format";

const LAYOUTS = { steps: "passo-a-passo", all: "completo" } as const;
type Layout = (typeof LAYOUTS)[keyof typeof LAYOUTS];
/** Remembers the layout the user prefers in this browser. */
const LAYOUT_STORAGE_KEY = "magistral-minuta-modo";
const SUGGESTION_FAILED = "Não foi possível enviar o documento para leitura. Tente novamente.";

interface MinutaStudioProps {
  /** Keys the unsent draft kept in this browser, which may be shared by the office. */
  userId: string;
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

/**
 * The minuta workspace: the same values filled step by step or all at once, the draft's progress while it
 * is written in the background, and the saved minuta's review page once it is ready.
 */
export function MinutaStudio({
  userId,
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
  const [appliedSuggestionId, setAppliedSuggestionId] = useState(start.appliedSuggestionId);
  const [reviewNotes, setReviewNotes] = useState(start.reviewNotes);
  const [wizard, setWizard] = useState<{ key: number; step: WizardStepId }>({
    key: 0,
    step: start.appliedSuggestionId ? "revisao" : "inicio",
  });
  const [hasEdited, setHasEdited] = useState(start.appliedSuggestionId !== null);
  const [storedLayout, setStoredLayout] = useLocalValue(LAYOUT_STORAGE_KEY);
  const [storedDraftJson, setStoredDraftJson] = useLocalValue(minutaDraftStorageKey(userId));
  const storedDraft = hasEdited ? null : parseStoredDraft(storedDraftJson);
  const layout: Layout = initialSuggestion || storedLayout !== LAYOUTS.all ? LAYOUTS.steps : LAYOUTS.all;

  const suggestion = useBackgroundTask(draftSuggestionResultSchema, initialSuggestion, {
    queryParam: DRAFT_SUGGESTION_QUERY_PARAM,
  });
  const { background, generate, minutaId } = useMinutaGeneration(initialTask);
  const isGenerating = background.isBusy;

  // The minuta is saved in the history: review it there, where it can be downloaded and discussed.
  useEffect(() => {
    if (minutaId) router.push(minutaPath(minutaId));
  }, [minutaId, router]);

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
        <Tabs value={layout} onValueChange={(next) => setStoredLayout(next)}>
          <TabsList aria-label="Como preencher">
            <TabsTrigger value={LAYOUTS.steps}>
              <ListChecks aria-hidden /> Passo a passo
            </TabsTrigger>
            <TabsTrigger value={LAYOUTS.all}>
              <Rows3 aria-hidden /> Todos os campos
            </TabsTrigger>
          </TabsList>
        </Tabs>
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

      {layout === LAYOUTS.steps ? (
        <MinutaWizard
          key={wizard.key}
          initialStep={wizard.step}
          personas={personas}
          clauses={clauses}
          librarySourceCount={librarySourceCount}
          values={values}
          onValuesChange={changeValues}
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
