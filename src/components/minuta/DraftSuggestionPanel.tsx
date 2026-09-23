"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { Button } from "@/components/ui/button";
import type { BackgroundTask } from "@/hooks/useBackgroundTask";
import { DOCUMENT_TYPE_LABELS, OTHER_DOCUMENT_TYPE_ID } from "@/lib/minuta/documentTypes";
import type { DraftSuggestionResult } from "@/lib/minuta/draftSuggestion";
import { plural } from "@/lib/text/plural";

interface DraftSuggestionPanelProps {
  suggestion: BackgroundTask<DraftSuggestionResult>;
  /** The suggestion shown was already applied to the form. */
  applied: boolean;
  disabled: boolean;
  onSuggest: () => void;
  onApply: (result: DraftSuggestionResult) => void;
}

function describe(result: DraftSuggestionResult): string {
  const { draft } = result;
  const type = draft.documentType === OTHER_DOCUMENT_TYPE_ID ? draft.customDocumentType : DOCUMENT_TYPE_LABELS[draft.documentType];
  const named = draft.parties.filter((party) => party.name).length;
  return [
    type,
    plural(named, "parte identificada", "partes identificadas"),
    draft.approvedClauseIds.length > 0 && plural(draft.approvedClauseIds.length, "cláusula aprovada", "cláusulas aprovadas"),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Offers to fill the form from the base document, follows that reading and lets the user apply it. */
export function DraftSuggestionPanel({ suggestion, applied, disabled, onSuggest, onApply }: DraftSuggestionPanelProps) {
  const { result, isBusy, startError, taskId } = suggestion;

  if (result && applied) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-primary" aria-hidden />
        Sugestões de {result.sourceName} aplicadas ao formulário. Revise cada etapa antes de gerar.
      </p>
    );
  }

  if (result) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5 p-3">
        <p className="text-sm font-medium">Sugestões prontas</p>
        <p className="text-xs text-muted-foreground">{describe(result)}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={disabled} onClick={() => onApply(result)}>
            Aplicar ao formulário
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={suggestion.dismiss}>
            Descartar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!taskId && (
        <>
          <Button type="button" variant="outline" size="sm" className="self-start" disabled={disabled || isBusy} onClick={onSuggest}>
            <Sparkles aria-hidden /> Preencher o formulário com IA
          </Button>
          <p className="text-xs text-muted-foreground">
            A IA lê o documento e sugere o tipo, as partes e as cláusulas. Nada muda até você aplicar.
          </p>
        </>
      )}
      {startError && <p className="text-xs text-destructive">{startError}</p>}
      <FollowedTaskStatus background={suggestion} runningTitle="Lendo o documento base" />
    </div>
  );
}
