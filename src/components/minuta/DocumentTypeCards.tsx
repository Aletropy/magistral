"use client";

import { Briefcase, FilePen, Handshake, House, LockKeyhole, type LucideIcon } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { DOCUMENT_TYPE_IDS, DOCUMENT_TYPE_LABELS, OTHER_DOCUMENT_TYPE_ID, type DocumentTypeId } from "@/lib/minuta/documentTypes";
import { DOCUMENT_TYPE_PRESETS } from "@/lib/minuta/documentTypePresets";
import { MAX_CUSTOM_DOCUMENT_TYPE_CHARS } from "@/lib/minuta/schema";
import { cn } from "@/lib/utils";

const ICONS: Record<DocumentTypeId, LucideIcon> = {
  locacao: House,
  "prestacao-servicos": Briefcase,
  "compra-venda": Handshake,
  nda: LockKeyhole,
  outro: FilePen,
};

/** "Outro (especificar)" reads oddly on a card. */
const CARD_LABELS: Partial<Record<DocumentTypeId, string>> = { outro: "Outro documento" };

interface DocumentTypeCardsProps {
  documentType: DocumentTypeId;
  customDocumentType: string;
  errors: Record<string, string>;
  disabled: boolean;
  onTypeChange: (documentType: DocumentTypeId) => void;
  onCustomTypeChange: (customDocumentType: string) => void;
}

/** The document types as large choices, with the description field only for "Outro". */
export function DocumentTypeCards({
  documentType,
  customDocumentType,
  errors,
  disabled,
  onTypeChange,
  onCustomTypeChange,
}: DocumentTypeCardsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Tipo de documento" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DOCUMENT_TYPE_IDS.map((id) => {
          const Icon = ICONS[id];
          const selected = id === documentType;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onTypeChange(id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition hover:bg-muted/50",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                selected && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{CARD_LABELS[id] ?? DOCUMENT_TYPE_LABELS[id]}</span>
                <span className="text-xs text-muted-foreground">{DOCUMENT_TYPE_PRESETS[id].summary}</span>
              </span>
            </button>
          );
        })}
      </div>
      {documentType === OTHER_DOCUMENT_TYPE_ID && (
        <FormField label="Qual documento?" htmlFor="customDocumentType" error={errors.customDocumentType}>
          <Input
            id="customDocumentType"
            autoFocus
            placeholder="Ex.: Termo de Cessão de Direitos Autorais"
            maxLength={MAX_CUSTOM_DOCUMENT_TYPE_CHARS}
            disabled={disabled}
            value={customDocumentType}
            aria-invalid={Boolean(errors.customDocumentType)}
            onChange={(event) => onCustomTypeChange(event.target.value)}
          />
        </FormField>
      )}
    </div>
  );
}
