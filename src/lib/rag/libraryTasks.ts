import "server-only";
import { z } from "zod";
import { loadDemoLibrary } from "@/lib/demo/loadDemo";
import { DocumentExtractionError } from "@/lib/documents/errors";
import { MAX_UPLOAD_BYTES } from "@/lib/documents/formats";
import { DOCUMENT_EXTRACTION_ERRORS } from "@/lib/documents/messages";
import type { EmbeddingModel } from "@/lib/llm/embeddings";
import { getEmbedder } from "@/lib/llm/getEmbedder";
import type { NotificationDraft } from "@/lib/notifications/types";
import type { TaskHandler } from "@/lib/tasks/handler";
import { plural } from "@/lib/text/plural";
import { resolveLibraryDir } from "./config";
import type { LibraryWorkOptions } from "./embedAll";
import { getLibraryRepository } from "./getLibraryRepository";
import { ingestDocument } from "./ingest";
import { LIBRARY_PATH } from "./paths";
import { reindexLibrary } from "./reindexLibrary";
import type { LibraryRepository } from "./repository";
import { syncLibraryFolder } from "./syncFolder";
import {
  demoLibraryResultSchema,
  libraryReindexResultSchema,
  librarySyncResultSchema,
  libraryUploadOutcomeSchema,
  libraryUploadResultSchema,
  type DemoLibraryResult,
  type FolderSyncReport,
  type LibraryReindexResult,
  type LibrarySyncResult,
  type LibraryUploadOutcome,
  type LibraryUploadResult,
} from "./taskResults";
import { LIBRARY_SOURCE_KINDS, type LibrarySourceKind } from "./types";

const EMBEDDING_PROGRESS_LABEL = "Indexando trechos";
const NO_PAYLOAD = z.object({});
type NoPayload = z.infer<typeof NO_PAYLOAD>;

/** A task's page on the library, where the user can see what it reported. */
export function libraryTaskPath(taskId: string): string {
  return `${LIBRARY_PATH}?tarefa=${encodeURIComponent(taskId)}`;
}

function failure(title: string) {
  return (message: string, task: { id: string }): NotificationDraft => ({
    level: "error",
    title,
    body: message,
    href: libraryTaskPath(task.id),
  });
}

/** The file's outcome as a pt-BR message; unexpected errors abort the whole upload instead. */
function uploadFailureMessage(error: unknown): string {
  if (error instanceof DocumentExtractionError) return DOCUMENT_EXTRACTION_ERRORS[error.reason].message;
  throw error;
}

async function ingestFile(
  library: LibraryRepository,
  embedding: EmbeddingModel,
  file: { name: string; bytes: Uint8Array },
  kind: LibrarySourceKind,
  options: LibraryWorkOptions,
): Promise<LibraryUploadOutcome> {
  const fileName = file.name;
  if (file.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return { fileName, status: "failed", message: DOCUMENT_EXTRACTION_ERRORS.too_large.message };
  }
  try {
    const document = { fileName, bytes: file.bytes, kind, folderPath: null };
    const result = await ingestDocument(library, embedding, document, options);
    return result.status === "added"
      ? { fileName, status: "added" }
      : { fileName, status: "duplicate", message: `Já está na biblioteca como “${result.existing.title}”.` };
  } catch (error) {
    return { fileName, status: "failed", message: uploadFailureMessage(error) };
  }
}

const uploadPayloadSchema = z.object({ kind: z.enum(LIBRARY_SOURCE_KINDS) });
type UploadPayload = { kind: LibrarySourceKind };

/** Adds uploaded PDF/DOCX files one by one; files done before a restart or retry are not redone. */
export const libraryUploadTask: TaskHandler<UploadPayload, LibraryUploadResult> = {
  kind: "library.upload",
  lane: "library",
  payloadSchema: uploadPayloadSchema,
  resultSchema: libraryUploadResultSchema,

  async run({ payload, signal, files, setFileOutcome, reportProgress }) {
    const library = getLibraryRepository();
    const embedding = getEmbedder();
    const uploaded = files();
    const outcomes: LibraryUploadOutcome[] = [];

    for (const [index, file] of uploaded.entries()) {
      if (file.outcome) {
        outcomes.push(libraryUploadOutcomeSchema.parse(JSON.parse(file.outcome)));
        continue;
      }
      signal.throwIfAborted();
      reportProgress(index, uploaded.length, `Arquivo ${index + 1} de ${uploaded.length}: ${file.name}`);
      const outcome = await ingestFile(library, embedding, file, payload.kind, { signal });
      setFileOutcome(file.position, JSON.stringify(outcome));
      outcomes.push(outcome);
    }
    return { outcomes };
  },

  describeSuccess(result, task) {
    const added = result.outcomes.filter((outcome) => outcome.status === "added").length;
    const failed = result.outcomes.filter((outcome) => outcome.status === "failed").length;
    const parts = [plural(added, "documento adicionado", "documentos adicionados")];
    if (failed > 0) parts.push(plural(failed, "falhou", "falharam"));
    return {
      level: failed > 0 ? "error" : "success",
      title: "Envio para a biblioteca concluído",
      body: `${parts.join(", ")}.`,
      href: libraryTaskPath(task.id),
    };
  },
  describeFailure: failure("O envio para a biblioteca falhou"),
};

function summarizeSync(report: FolderSyncReport): string {
  const changed = report.added.length + report.updated.length + report.removed.length;
  if (changed === 0 && report.failed.length === 0) return "A pasta já estava em dia com a biblioteca.";
  return [
    report.added.length > 0 && plural(report.added.length, "adicionado", "adicionados"),
    report.updated.length > 0 && plural(report.updated.length, "atualizado", "atualizados"),
    report.removed.length > 0 && plural(report.removed.length, "removido", "removidos"),
    report.failed.length > 0 && plural(report.failed.length, "com falha", "com falha"),
  ]
    .filter(Boolean)
    .join(", ")
    .concat(".");
}

/** Mirrors the library folder into the index. */
export const librarySyncTask: TaskHandler<NoPayload, LibrarySyncResult> = {
  kind: "library.sync",
  lane: "library",
  payloadSchema: NO_PAYLOAD,
  resultSchema: librarySyncResultSchema,

  async run({ signal, reportProgress }) {
    const folder = resolveLibraryDir();
    const report = await syncLibraryFolder(getLibraryRepository(), getEmbedder(), folder, {
      signal,
      onProgress: (done, total) => reportProgress(done, total, `Arquivo ${done + 1} de ${total}`),
    });
    return { folder, report };
  },

  describeSuccess: (result, task) => ({
    level: result.report.failed.length > 0 ? "error" : "success",
    title: "Pasta da biblioteca sincronizada",
    body: summarizeSync(result.report),
    href: libraryTaskPath(task.id),
  }),
  describeFailure: failure("A sincronização da biblioteca falhou"),
};

/** Rebuilds the vector index with the embedding model configured now. */
export const libraryReindexTask: TaskHandler<NoPayload, LibraryReindexResult> = {
  kind: "library.reindex",
  lane: "library",
  payloadSchema: NO_PAYLOAD,
  resultSchema: libraryReindexResultSchema,

  async run({ signal, reportProgress }) {
    const embedding = getEmbedder();
    const chunks = await reindexLibrary(getLibraryRepository(), embedding, {
      signal,
      onProgress: (done, total) => reportProgress(done, total, EMBEDDING_PROGRESS_LABEL),
    });
    return { chunks, model: embedding.id };
  },

  describeSuccess: (result, task) => ({
    level: "success",
    title: "Biblioteca reindexada",
    body: `${plural(result.chunks, "trecho indexado", "trechos indexados")} com ${result.model}.`,
    href: libraryTaskPath(task.id),
  }),
  describeFailure: failure("A reindexação da biblioteca falhou"),
};

/** Indexes the fictitious example norms. */
export const libraryDemoTask: TaskHandler<NoPayload, DemoLibraryResult> = {
  kind: "library.demo",
  lane: "library",
  payloadSchema: NO_PAYLOAD,
  resultSchema: demoLibraryResultSchema,

  async run({ signal, reportProgress }) {
    const added = await loadDemoLibrary(getLibraryRepository(), getEmbedder(), {
      signal,
      onProgress: (done, total) => reportProgress(done, total, `Norma ${Math.min(done + 1, total)} de ${total}`),
    });
    return { added };
  },

  describeSuccess: (result, task) => ({
    level: "success",
    title: "Exemplos carregados na biblioteca",
    body: `${plural(result.added, "norma de exemplo adicionada", "normas de exemplo adicionadas")}.`,
    href: libraryTaskPath(task.id),
  }),
  describeFailure: failure("Não foi possível carregar os exemplos da biblioteca"),
};
