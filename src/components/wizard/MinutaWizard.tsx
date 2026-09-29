"use client";

import { FilePlus2, FileText, Lightbulb } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ApprovedClausesField } from "@/components/ApprovedClausesField";
import { LibraryToggle } from "@/components/LibraryToggle";
import { BaseDocumentField } from "@/components/minuta/BaseDocumentField";
import { ConditionsField } from "@/components/minuta/ConditionsField";
import { DocumentTypeCards } from "@/components/minuta/DocumentTypeCards";
import { ReviewNotes } from "@/components/minuta/ReviewNotes";
import { PartiesField } from "@/components/PartiesField";
import { PersonaSelector } from "@/components/PersonaSelector";
import { Button } from "@/components/ui/button";
import { LOADING_LABEL, useIsHydrated } from "@/hooks/useIsHydrated";
import { clauseAppliesTo, type ClauseOption } from "@/lib/clauses/types";
import { applyPresetRoles, type WizardConditions } from "@/lib/minuta/conditions";
import type { DocumentTypeId } from "@/lib/minuta/documentTypes";
import { minutaRequestSchema, type MinutaFormValues, type MinutaRequest } from "@/lib/minuta/schema";
import { firstInvalidStep, relevantSteps, validateStep, type WizardStepId } from "@/lib/minuta/wizardSteps";
import type { PersonaSummary } from "@/lib/personas/types";
import { cn } from "@/lib/utils";
import { WizardReview } from "./WizardReview";
import { WizardStepper } from "./WizardStepper";

interface MinutaWizardProps {
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
  values: MinutaFormValues;
  onValuesChange: (values: MinutaFormValues) => void;
  /** The answers of the conditions step, which become the request's clauses text. */
  conditions: WizardConditions;
  onConditionsChange: (conditions: WizardConditions) => void;
  /** Where to open; a suggestion applied from a notification opens on the review. */
  initialStep?: WizardStepId;
  isSubmitting: boolean;
  isBusy: boolean;
  /** Shown under a loaded base document: the AI fill-in offer. */
  baseDocumentExtras?: ReactNode;
  /** What the AI asked to double-check after filling the form. */
  reviewNotes: string[];
  onSubmit: (request: MinutaRequest) => void;
}

function StartChoice({
  selected,
  icon,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-1 items-start gap-3 rounded-lg border bg-card p-4 text-left transition hover:bg-muted/50",
        selected && "border-primary bg-primary/5 ring-1 ring-primary",
      )}
    >
      <span className="mt-0.5 text-primary">{icon}</span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

/**
 * The guided way to write a minuta request: one question per screen, only the steps the office has
 * something for, and the tips for each step a click away.
 */
export function MinutaWizard({
  personas,
  clauses,
  librarySourceCount,
  values,
  onValuesChange,
  conditions,
  onConditionsChange,
  initialStep = "tipo",
  isSubmitting,
  isBusy,
  baseDocumentExtras,
  reviewNotes,
  onSubmit,
}: MinutaWizardProps) {
  const isHydrated = useIsHydrated();
  const applicableClauseCount = clauses.filter((clause) => clauseAppliesTo(clause, values.documentType)).length;
  const steps = useMemo(
    () => relevantSteps({ applicableClauseCount, librarySourceCount }),
    [applicableClauseCount, librarySourceCount],
  );
  const [currentId, setCurrentId] = useState<WizardStepId>(initialStep);
  const [furthestId, setFurthestId] = useState<WizardStepId>(initialStep);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startsFromDocument, setStartsFromDocument] = useState(Boolean(values.baseDocument));
  // A step that stopped being relevant (e.g. the type changed) falls back to the nearest one before it.
  const current = Math.max(0, steps.findIndex((step) => step.id === currentId));
  const furthest = Math.max(current, steps.findIndex((step) => step.id === furthestId));
  const step = steps[current];
  const isLast = step.id === "revisao";
  const disabled = isSubmitting;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasMoved = useRef(false);

  // Screen readers and keyboards land on the new step's title, not on the button that was pressed.
  useEffect(() => {
    if (hasMoved.current) headingRef.current?.focus();
  }, [currentId]);

  function update(changes: Partial<MinutaFormValues>) {
    onValuesChange({ ...values, ...changes });
  }

  function changeType(documentType: DocumentTypeId) {
    update({
      documentType,
      parties: applyPresetRoles(values.parties, values.documentType, documentType),
      // Approved clauses of another type would no longer be offered.
      approvedClauseIds: values.approvedClauseIds.filter((id) => {
        const clause = clauses.find((option) => option.id === id);
        return clause !== undefined && clauseAppliesTo(clause, documentType);
      }),
    });
  }

  function goTo(index: number) {
    hasMoved.current = true;
    setErrors({});
    const target = steps[index];
    setCurrentId(target.id);
    if (index > furthest) setFurthestId(target.id);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLast) {
      const stepErrors = validateStep(step, values);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      goTo(current + 1);
      return;
    }
    const invalid = firstInvalidStep(values, steps);
    if (invalid) {
      goTo(steps.indexOf(invalid));
      setErrors(validateStep(invalid, values));
      return;
    }
    const result = minutaRequestSchema.safeParse({ ...values, useLibrary: values.useLibrary && librarySourceCount > 0 });
    if (result.success) onSubmit(result.data);
  }

  function chooseStart(fromDocument: boolean) {
    setStartsFromDocument(fromDocument);
    if (!fromDocument && values.baseDocument) update({ baseDocument: null });
  }

  return (
    <form
      method="post"
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-xl border bg-card p-4 sm:p-8"
      noValidate
      onSubmit={handleSubmit}
    >
      <WizardStepper
        steps={steps}
        current={current}
        furthest={furthest}
        onSelect={(id) => goTo(steps.findIndex((candidate) => candidate.id === id))}
      />

      <header className="flex flex-col gap-1">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          {step.title}
        </h2>
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </header>

      {step.id !== "tipo" && step.id !== "inicio" && <ReviewNotes notes={reviewNotes} />}

      {step.id === "tipo" && (
        <DocumentTypeCards
          documentType={values.documentType}
          customDocumentType={values.customDocumentType}
          errors={errors}
          disabled={disabled}
          onTypeChange={changeType}
          onCustomTypeChange={(customDocumentType) => update({ customDocumentType })}
        />
      )}

      {step.id === "inicio" && (
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Ponto de partida" className="flex flex-col gap-3 sm:flex-row">
            <StartChoice
              selected={!startsFromDocument}
              icon={<FilePlus2 className="size-5" aria-hidden />}
              title="Começar do zero"
              description="Você responde algumas perguntas sobre as partes e as condições."
              onSelect={() => chooseStart(false)}
            />
            <StartChoice
              selected={startsFromDocument}
              icon={<FileText className="size-5" aria-hidden />}
              title="Usar um modelo"
              description="Envie um contrato que a nova minuta deve seguir."
              onSelect={() => chooseStart(true)}
            />
          </div>
          {startsFromDocument && (
            <BaseDocumentField
              value={values.baseDocument}
              error={errors["baseDocument.text"]}
              disabled={disabled}
              onChange={(baseDocument) => update({ baseDocument })}
            >
              {baseDocumentExtras}
            </BaseDocumentField>
          )}
        </div>
      )}

      {step.id === "partes" && (
        <PartiesField
          compact
          parties={values.parties}
          errors={errors}
          disabled={disabled}
          onChange={(parties) => update({ parties })}
        />
      )}

      {step.id === "condicoes" && (
        <ConditionsField
          documentType={values.documentType}
          conditions={conditions}
          error={errors.clauses}
          disabled={disabled}
          onChange={onConditionsChange}
        />
      )}

      {step.id === "clausulas" && (
        <ApprovedClausesField
          clauses={clauses}
          documentType={values.documentType}
          value={values.approvedClauseIds}
          error={errors.approvedClauseIds}
          disabled={disabled}
          onChange={(approvedClauseIds) => update({ approvedClauseIds })}
        />
      )}

      {step.id === "persona" && (
        <PersonaSelector
          personas={personas}
          value={values.persona}
          error={errors.persona}
          disabled={disabled}
          onChange={(persona) => update({ persona })}
        />
      )}

      {step.id === "fundamentacao" && (
        <LibraryToggle
          checked={values.useLibrary}
          sourceCount={librarySourceCount}
          disabled={disabled}
          onChange={(useLibrary) => update({ useLibrary })}
        />
      )}

      {isLast && (
        <WizardReview
          values={values}
          personas={personas}
          clauses={clauses}
          librarySourceCount={librarySourceCount}
          visibleSteps={steps.map((visible) => visible.id)}
          onEdit={(id) => goTo(steps.findIndex((candidate) => candidate.id === id))}
        />
      )}

      <details className="group rounded-lg bg-muted/40 px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
          <Lightbulb className="size-4 text-primary" aria-hidden />
          Dicas para esta etapa
        </summary>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground">
          {step.guide.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </details>

      <footer className="flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="ghost" disabled={current === 0} onClick={() => goTo(current - 1)}>
          Voltar
        </Button>
        {isLast ? (
          <Button type="submit" size="lg" disabled={isSubmitting || isBusy || !isHydrated}>
            {!isHydrated ? LOADING_LABEL : isSubmitting || isBusy ? "Gerando em segundo plano…" : "Gerar minuta"}
          </Button>
        ) : (
          <Button type="submit" disabled={!isHydrated}>
            {isHydrated ? "Continuar" : LOADING_LABEL}
          </Button>
        )}
      </footer>
    </form>
  );
}
