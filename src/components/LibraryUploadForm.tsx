"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { FileInput } from "@/components/ui/FileInput";
import { NATIVE_SELECT_CLASS } from "@/components/ui/nativeSelect";
import { useLibraryActions } from "@/hooks/useLibraryActions";
import { DOCUMENT_ACCEPT, MAX_FILES_PER_UPLOAD, MAX_UPLOAD_MEBIBYTES } from "@/lib/documents/formats";
import type { LibraryUploadOutcome, LibraryUploadResponseBody } from "@/lib/http/api";
import { LIBRARY_SOURCE_KINDS, LIBRARY_SOURCE_KIND_LABELS, type LibrarySourceKind } from "@/lib/rag/types";

const OUTCOME_LABELS: Record<LibraryUploadOutcome["status"], string> = {
  added: "✓ Adicionado",
  duplicate: "= Já existia",
  failed: "✗ Falhou",
};

export function LibraryUploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [kind, setKind] = useState<LibrarySourceKind>("lei");
  const [outcomes, setOutcomes] = useState<LibraryUploadOutcome[]>([]);
  const { isPending, error, upload } = useLibraryActions();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = await upload<LibraryUploadResponseBody>(files, kind);
    if (!body) return;
    setOutcomes(body.outcomes);
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-3 rounded-lg border bg-card p-4" onSubmit={handleSubmit}>
      <h2 className="text-sm font-medium">Enviar documentos</h2>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <FormField
          label="Arquivos"
          htmlFor="library-files"
          hint={`PDF com texto ou DOCX, até ${MAX_UPLOAD_MEBIBYTES} MB cada, ${MAX_FILES_PER_UPLOAD} por envio.`}
        >
          <FileInput id="library-files" multiple accept={DOCUMENT_ACCEPT} disabled={isPending} onFiles={setFiles} />
        </FormField>
        <FormField label="Tipo" htmlFor="library-kind">
          <select
            id="library-kind"
            className={NATIVE_SELECT_CLASS}
            disabled={isPending}
            value={kind}
            onChange={(event) => setKind(event.target.value as LibrarySourceKind)}
          >
            {LIBRARY_SOURCE_KINDS.map((option) => (
              <option key={option} value={option}>
                {LIBRARY_SOURCE_KIND_LABELS[option]}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <Button type="submit" className="self-start" disabled={isPending || files.length === 0}>
        {isPending ? "Indexando documentos…" : "Adicionar à biblioteca"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {outcomes.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {outcomes.map((outcome) => (
            <li key={outcome.fileName}>
              <span className="font-medium">{OUTCOME_LABELS[outcome.status]}</span> {outcome.fileName}
              {outcome.message && <span className="text-muted-foreground"> — {outcome.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
