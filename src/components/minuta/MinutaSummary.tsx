import type { ClauseOption } from "@/lib/clauses/types";
import { DOCUMENT_TYPE_LABELS, OTHER_DOCUMENT_TYPE_ID } from "@/lib/minuta/documentTypes";
import type { MinutaFormValues } from "@/lib/minuta/schema";
import type { PersonaSummary } from "@/lib/personas/types";
import { plural } from "@/lib/text/plural";

interface MinutaSummaryProps {
  values: MinutaFormValues;
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** What the minuta will be, at a glance, beside the form that fills it. */
export function MinutaSummary({ values, personas, clauses, librarySourceCount }: MinutaSummaryProps) {
  const type =
    values.documentType === OTHER_DOCUMENT_TYPE_ID
      ? values.customDocumentType.trim() || "Outro (descreva o tipo)"
      : DOCUMENT_TYPE_LABELS[values.documentType];
  const parties = values.parties.map((party) => party.name.trim()).filter(Boolean);
  const persona = personas.find((option) => option.id === values.persona)?.name ?? "Não escolhida";
  const approved = values.approvedClauseIds.filter((id) => clauses.some((clause) => clause.id === id)).length;
  const usesLibrary = values.useLibrary && librarySourceCount > 0;

  return (
    <aside className="flex flex-col gap-4 rounded-lg border bg-card p-4" aria-label="Resumo da minuta">
      <p className="text-sm font-medium">Resumo</p>
      <dl className="flex flex-col gap-3">
        <Row label="Documento">{type}</Row>
        <Row label="Partes">{parties.length > 0 ? parties.join(" × ") : "Ainda sem nomes"}</Row>
        <Row label="Persona">{persona}</Row>
        <Row label="Cláusulas">
          {approved > 0 ? plural(approved, "aprovada", "aprovadas") : "Nenhuma aprovada"}
          {values.clauses.trim() ? " + pedidos específicos" : ""}
        </Row>
        <Row label="Fundamentação">{usesLibrary ? "Com a biblioteca jurídica" : "Sem a biblioteca"}</Row>
        {values.baseDocument && <Row label="Documento base">{values.baseDocument.name || "Documento enviado"}</Row>}
      </dl>
    </aside>
  );
}
