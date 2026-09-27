"use client";

import { CircleCheck, CircleEqual, CircleX, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/FileInput";
import { FormField } from "@/components/ui/FormField";
import { NATIVE_SELECT_CLASS } from "@/components/ui/nativeSelect";
import { useBackgroundTask } from "@/hooks/useBackgroundTask";
import { DOCUMENT_ACCEPT, MAX_FILES_PER_UPLOAD, MAX_UPLOAD_MEBIBYTES } from "@/lib/documents/formats";
import { LIBRARY_SOURCES_ENDPOINT, UPLOAD_FILE_FIELD, UPLOAD_KIND_FIELD } from "@/lib/http/endpoints";
import { libraryUploadResultSchema, type LibraryUploadOutcome } from "@/lib/rag/taskResults";
import { LIBRARY_SOURCE_KINDS, LIBRARY_SOURCE_KIND_LABELS, type LibrarySourceKind } from "@/lib/rag/types";
import type { TaskDetail } from "@/lib/tasks/types";

const OUTCOME_LABELS: Record<LibraryUploadOutcome["status"], string> = {
  added: "Adicionado",
  duplicate: "Já existia",
  failed: "Falhou",
};

const OUTCOME_ICONS: Record<LibraryUploadOutcome["status"], { icon: LucideIcon; className: string }> = {
  added: { icon: CircleCheck, className: "text-primary" },
  duplicate: { icon: CircleEqual, className: "text-muted-foreground" },
  failed: { icon: CircleX, className: "text-destructive" },
};

function OutcomeIcon({ status }: { status: LibraryUploadOutcome["status"] }) {
  const { icon: Icon, className } = OUTCOME_ICONS[status];
  return <Icon className={`mr-1 inline size-4 align-text-bottom ${className}`} aria-hidden />;
}

const UPLOAD_FAILED = "Não foi possível enviar os documentos. Tente novamente.";

/** Uploads documents to the library; indexing runs in the background and the outcomes show when it ends. */
export function LibraryUploadForm({ initialTask }: { initialTask: TaskDetail | null }) {
  const [files, setFiles] = useState<File[]>([]);
  const [kind, setKind] = useState<LibrarySourceKind>("lei");
  const background = useBackgroundTask(libraryUploadResultSchema, initialTask);
  const { isBusy, startError, result } = background;
  const outcomes = result?.outcomes ?? [];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData();
    files.forEach((file) => body.append(UPLOAD_FILE_FIELD, file));
    body.append(UPLOAD_KIND_FIELD, kind);
    void background.start(() => fetch(LIBRARY_SOURCES_ENDPOINT, { method: "POST", body }), UPLOAD_FAILED);
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
          <FileInput id="library-files" multiple accept={DOCUMENT_ACCEPT} disabled={isBusy} onFiles={setFiles} />
        </FormField>
        <FormField label="Tipo" htmlFor="library-kind">
          <select
            id="library-kind"
            className={NATIVE_SELECT_CLASS}
            disabled={isBusy}
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
      <Button type="submit" className="self-start" disabled={isBusy || files.length === 0}>
        {isBusy ? "Indexando em segundo plano…" : "Adicionar à biblioteca"}
      </Button>
      {startError && <p className="text-sm text-destructive">{startError}</p>}
      <FollowedTaskStatus background={background} runningTitle="Indexando os documentos" />
      {outcomes.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {outcomes.map((outcome) => (
            <li key={outcome.fileName}>
              <OutcomeIcon status={outcome.status} />
              <span className="font-medium">{OUTCOME_LABELS[outcome.status]}</span> {outcome.fileName}
              {outcome.message && <span className="text-muted-foreground"> — {outcome.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
