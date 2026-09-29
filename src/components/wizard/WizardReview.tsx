"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ClauseOption } from "@/lib/clauses/types";
import { DOCUMENT_TYPE_LABELS, OTHER_DOCUMENT_TYPE_ID } from "@/lib/minuta/documentTypes";
import type { MinutaFormValues } from "@/lib/minuta/schema";
import type { WizardStepId } from "@/lib/minuta/wizardSteps";
import type { PersonaSummary } from "@/lib/personas/types";

interface WizardReviewProps {
  values: MinutaFormValues;
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
  /** Steps the wizard showed; the review only lists those. */
  visibleSteps: readonly WizardStepId[];
  onEdit: (step: WizardStepId) => void;
}

function Group({ title, step, onEdit, children }: { title: string; step: WizardStepId; onEdit: (step: WizardStepId) => void; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 border-b pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => onEdit(step)}>
          Editar
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

/** Everything the wizard collected, grouped by step, each with a way back to change it. */
export function WizardReview({ values, personas, clauses, librarySourceCount, visibleSteps, onEdit }: WizardReviewProps) {
  const shows = (step: WizardStepId) => visibleSteps.includes(step);
  const type =
    values.documentType === OTHER_DOCUMENT_TYPE_ID
      ? values.customDocumentType || "Outro (não descrito)"
      : DOCUMENT_TYPE_LABELS[values.documentType];
  const persona = personas.find((option) => option.id === values.persona);
  const approved = values.approvedClauseIds.flatMap((id) => clauses.find((clause) => clause.id === id) ?? []);
  const usesLibrary = values.useLibrary && librarySourceCount > 0;

  return (
    <div className="flex flex-col gap-3">
      <Group title="Tipo de documento" step="tipo" onEdit={onEdit}>
        {type}
      </Group>
      <Group title="Ponto de partida" step="inicio" onEdit={onEdit}>
        {values.baseDocument ? `Modelo: ${values.baseDocument.name || "documento enviado"}` : "Do zero"}
      </Group>
      <Group title="Partes" step="partes" onEdit={onEdit}>
        <ul className="flex flex-col gap-0.5">
          {values.parties.map((party, index) => (
            <li key={index}>
              <span className="text-foreground">{party.name || "(sem nome)"}</span> — {party.role || "(sem papel)"}
              {party.qualification && `, ${party.qualification}`}
            </li>
          ))}
        </ul>
      </Group>
      <Group title="Condições" step="condicoes" onEdit={onEdit}>
        {values.clauses ? (
          <p className="whitespace-pre-line">{values.clauses}</p>
        ) : (
          "Nenhuma informada: a IA usa as condições usuais do tipo de documento."
        )}
      </Group>
      {shows("clausulas") && (
        <Group title="Cláusulas aprovadas" step="clausulas" onEdit={onEdit}>
          {approved.length === 0 ? (
            "Nenhuma escolhida."
          ) : (
            <ol className="list-decimal pl-5">
              {approved.map((clause) => (
                <li key={clause.id}>{clause.title}</li>
              ))}
            </ol>
          )}
        </Group>
      )}
      <Group title="Persona" step="persona" onEdit={onEdit}>
        {persona ? `${persona.name} — ${persona.description}` : "Nenhuma selecionada"}
      </Group>
      {shows("fundamentacao") && (
        <Group title="Fundamentação" step="fundamentacao" onEdit={onEdit}>
          {usesLibrary ? "Com a biblioteca jurídica" : "Sem a biblioteca jurídica"}
        </Group>
      )}
    </div>
  );
}
