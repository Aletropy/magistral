"use client";

import { FilePlus2, FileText } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { ApprovedClausesField } from "@/components/ApprovedClausesField";
import { LibraryToggle } from "@/components/LibraryToggle";
import { BaseDocumentField } from "@/components/minuta/BaseDocumentField";
import { ClausesTextField } from "@/components/minuta/ClausesTextField";
import { DocumentTypeField } from "@/components/minuta/DocumentTypeField";
import { ReviewNotes } from "@/components/minuta/ReviewNotes";
import { PartiesField } from "@/components/PartiesField";
import { PersonaSelector } from "@/components/PersonaSelector";
import { Button } from "@/components/ui/button";
import type { ClauseOption } from "@/lib/clauses/types";
import { minutaRequestSchema, type MinutaFormValues, type MinutaRequest } from "@/lib/minuta/schema";
import {
  WIZARD_STEPS,
  firstInvalidStep,
  stepIndex,
  validateStep,
  type WizardStepId,
} from "@/lib/minuta/wizardSteps";
import type { PersonaSummary } from "@/lib/personas/types";
import { cn } from "@/lib/utils";
import { WizardGuide } from "./WizardGuide";
import { WizardReview } from "./WizardReview";
import { WizardStepper } from "./WizardStepper";

const LAST_STEP = WIZARD_STEPS.length - 1;

interface MinutaWizardProps {
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
  values: MinutaFormValues;
  onValuesChange: (values: MinutaFormValues) => void;
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
      aria-pressed={selected}
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

/** The guided way to fill a minuta request: one topic per step, a guide beside it and a review at the end. */
export function MinutaWizard({
  personas,
  clauses,
  librarySourceCount,
  values,
  onValuesChange,
  initialStep = "inicio",
  isSubmitting,
  isBusy,
  baseDocumentExtras,
  reviewNotes,
  onSubmit,
}: MinutaWizardProps) {
  const [current, setCurrent] = useState(stepIndex(initialStep));
  const [furthest, setFurthest] = useState(stepIndex(initialStep) === 0 ? 0 : LAST_STEP);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startsFromDocument, setStartsFromDocument] = useState(Boolean(values.baseDocument));
  const step = WIZARD_STEPS[current];
  const disabled = isSubmitting;

  function update(changes: Partial<MinutaFormValues>) {
    onValuesChange({ ...values, ...changes });
  }

  function goTo(index: number) {
    setErrors({});
    setCurrent(index);
    setFurthest((previous) => Math.max(previous, index));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const stepErrors = validateStep(step, values);
    if (Object.keys(stepErrors).length > 0 && step.id !== "revisao") {
      setErrors(stepErrors);
      return;
    }
    if (step.id !== "revisao") {
      goTo(current + 1);
      return;
    }
    const invalid = firstInvalidStep(values);
    if (invalid) {
      goTo(stepIndex(invalid.id));
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
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <form className="flex flex-col gap-6 rounded-lg border bg-card p-4 sm:p-6" noValidate onSubmit={handleSubmit}>
        <WizardStepper steps={WIZARD_STEPS} current={current} furthest={furthest} onSelect={(id) => goTo(stepIndex(id))} />

        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">{step.title}</h2>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </header>

        {step.id !== "inicio" && <ReviewNotes notes={reviewNotes} />}

        {step.id === "inicio" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <StartChoice
                selected={!startsFromDocument}
                icon={<FilePlus2 className="size-5" aria-hidden />}
                title="Começar do zero"
                description="Você informa o tipo, as partes e as cláusulas nas próximas etapas."
                onSelect={() => chooseStart(false)}
              />
              <StartChoice
                selected={startsFromDocument}
                icon={<FileText className="size-5" aria-hidden />}
                title="A partir de um documento base"
                description="Envie um contrato ou modelo que a nova minuta deve seguir."
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

        {step.id === "tipo" && (
          <DocumentTypeField
            documentType={values.documentType}
            customDocumentType={values.customDocumentType}
            errors={errors}
            disabled={disabled}
            onChange={update}
          />
        )}

        {step.id === "partes" && (
          <PartiesField parties={values.parties} errors={errors} disabled={disabled} onChange={(parties) => update({ parties })} />
        )}

        {step.id === "clausulas" && (
          <div className="flex flex-col gap-6">
            <ApprovedClausesField
              clauses={clauses}
              documentType={values.documentType}
              value={values.approvedClauseIds}
              error={errors.approvedClauseIds}
              disabled={disabled}
              onChange={(approvedClauseIds) => update({ approvedClauseIds })}
            />
            <ClausesTextField
              value={values.clauses}
              error={errors.clauses}
              disabled={disabled}
              onChange={(clauses) => update({ clauses })}
            />
          </div>
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

        {step.id === "revisao" && (
          <WizardReview
            values={values}
            personas={personas}
            clauses={clauses}
            librarySourceCount={librarySourceCount}
            onEdit={(id) => goTo(stepIndex(id))}
          />
        )}

        <footer className="flex items-center justify-between gap-3 border-t pt-4">
          <Button type="button" variant="ghost" disabled={current === 0} onClick={() => goTo(current - 1)}>
            Voltar
          </Button>
          {step.id === "revisao" ? (
            <Button type="submit" size="lg" disabled={isSubmitting || isBusy}>
              {isSubmitting || isBusy ? "Gerando em segundo plano…" : "Gerar minuta"}
            </Button>
          ) : (
            <Button type="submit">Continuar</Button>
          )}
        </footer>
      </form>

      <WizardGuide step={step} />
    </div>
  );
}
