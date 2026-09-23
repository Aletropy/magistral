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
export function WizardReview({ values, personas, clauses, librarySourceCount, onEdit }: WizardReviewProps) {
  const type =
    values.documentType === OTHER_DOCUMENT_TYPE_ID
      ? values.customDocumentType || "Outro (não descrito)"
      : DOCUMENT_TYPE_LABELS[values.documentType];
  const persona = personas.find((option) => option.id === values.persona);
  const approved = values.approvedClauseIds.flatMap((id) => clauses.find((clause) => clause.id === id) ?? []);
  const usesLibrary = values.useLibrary && librarySourceCount > 0;

  return (
    <div className="flex flex-col gap-3">
      <Group title="Ponto de partida" step="inicio" onEdit={onEdit}>
        {values.baseDocument ? `Documento base: ${values.baseDocument.name || "enviado"}` : "Do zero"}
      </Group>
      <Group title="Tipo de documento" step="tipo" onEdit={onEdit}>
        {type}
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
      <Group title="Cláusulas" step="clausulas" onEdit={onEdit}>
        {approved.length === 0 && !values.clauses && "Somente as cláusulas usuais do tipo de documento."}
        {approved.length > 0 && (
          <ol className="list-decimal pl-5">
            {approved.map((clause) => (
              <li key={clause.id}>{clause.title}</li>
            ))}
          </ol>
        )}
        {values.clauses && <p className="mt-1 whitespace-pre-line">{values.clauses}</p>}
      </Group>
      <Group title="Persona" step="persona" onEdit={onEdit}>
        {persona ? `${persona.name} — ${persona.description}` : "Nenhuma selecionada"}
      </Group>
      <Group title="Fundamentação" step="fundamentacao" onEdit={onEdit}>
        {usesLibrary ? "Com a biblioteca jurídica" : "Sem a biblioteca jurídica"}
      </Group>
    </div>
  );
}
