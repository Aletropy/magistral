"use client";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { NATIVE_SELECT_CLASS } from "@/components/ui/nativeSelect";
import {
  DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_LABELS,
  OTHER_DOCUMENT_TYPE_ID,
  type DocumentTypeId,
} from "@/lib/minuta/documentTypes";
import { MAX_CUSTOM_DOCUMENT_TYPE_CHARS } from "@/lib/minuta/schema";

interface DocumentTypeFieldProps {
  documentType: DocumentTypeId;
  customDocumentType: string;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (changes: { documentType?: DocumentTypeId; customDocumentType?: string }) => void;
}

/** The document type, plus a description when it is "Outro". */
export function DocumentTypeField({ documentType, customDocumentType, errors, disabled, onChange }: DocumentTypeFieldProps) {
  return (
    <>
      <FormField label="Tipo de documento" htmlFor="documentType" error={errors.documentType}>
        <select
          id="documentType"
          className={NATIVE_SELECT_CLASS}
          disabled={disabled}
          value={documentType}
          onChange={(event) => onChange({ documentType: event.target.value as DocumentTypeId })}
        >
          {DOCUMENT_TYPE_IDS.map((id) => (
            <option key={id} value={id}>
              {DOCUMENT_TYPE_LABELS[id]}
            </option>
          ))}
        </select>
      </FormField>

      {documentType === OTHER_DOCUMENT_TYPE_ID && (
        <FormField label="Qual documento?" htmlFor="customDocumentType" error={errors.customDocumentType}>
          <Input
            id="customDocumentType"
            placeholder="Ex.: Termo de Cessão de Direitos Autorais"
            maxLength={MAX_CUSTOM_DOCUMENT_TYPE_CHARS}
            disabled={disabled}
            value={customDocumentType}
            aria-invalid={Boolean(errors.customDocumentType)}
            onChange={(event) => onChange({ customDocumentType: event.target.value })}
          />
        </FormField>
      )}
    </>
  );
}
