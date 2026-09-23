"use client";

import { FileText, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/FileInput";
import { useDocumentText } from "@/hooks/useDocumentText";
import { DOCUMENT_ACCEPT, MAX_UPLOAD_MEBIBYTES } from "@/lib/documents/formats";
import { MAX_BASE_DOCUMENT_CHARS, type BaseDocument } from "@/lib/minuta/schema";
import { formatInteger } from "@/lib/usage/format";

const PREVIEW_CHARS = 600;

interface BaseDocumentFieldProps {
  value: BaseDocument | null | undefined;
  error?: string;
  disabled: boolean;
  onChange: (value: BaseDocument | null) => void;
  /** Shown under a loaded document, e.g. the AI fill-in offer. */
  children?: ReactNode;
}

function tooLongMessage(length: number): string {
  return `O documento tem ${formatInteger(length)} caracteres; o limite é ${formatInteger(MAX_BASE_DOCUMENT_CHARS)}. Envie só o trecho que deve servir de modelo.`;
}

/** Uploads a PDF/DOCX whose text becomes the model the minuta is drafted on. */
export function BaseDocumentField({ value, error, disabled, onChange, children }: BaseDocumentFieldProps) {
  const { isReading, error: readError, read } = useDocumentText();
  const [lengthError, setLengthError] = useState<string | null>(null);
  const shownError = lengthError ?? readError ?? error;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLengthError(null);
    const text = await read(file);
    if (text === null) return;
    if (text.length > MAX_BASE_DOCUMENT_CHARS) {
      setLengthError(tooLongMessage(text.length));
      return;
    }
    onChange({ name: file.name, text });
  }

  const picker = (
    <FileInput
      id="base-document"
      accept={DOCUMENT_ACCEPT}
      disabled={disabled || isReading}
      ariaLabel={value ? "Trocar documento base" : "Escolher documento base"}
      onFiles={([file]) => void handleFile(file)}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {value ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{value.name || "Documento base"}</p>
                <p className="text-xs text-muted-foreground">{formatInteger(value.text.length)} caracteres de texto</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(null)}
              aria-label="Remover documento base"
            >
              <X aria-hidden /> Remover
            </Button>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">Ver o texto extraído</summary>
            <p className="mt-2 max-h-48 overflow-y-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
              {value.text.slice(0, PREVIEW_CHARS)}
              {value.text.length > PREVIEW_CHARS && "…"}
            </p>
          </details>
          {children}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Trocar por outro arquivo:</span>
            {picker}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {picker}
          <p className="text-xs text-muted-foreground">
            PDF com texto selecionável ou DOCX, até {MAX_UPLOAD_MEBIBYTES} MB. A IA segue a estrutura e as cláusulas
            do documento, mas usa as partes informadas aqui.
          </p>
        </div>
      )}
      {isReading && <p className="text-xs text-muted-foreground">Lendo o arquivo…</p>}
      {shownError && (
        <p role="alert" className="text-xs text-destructive">
          {shownError}
        </p>
      )}
    </div>
  );
}
