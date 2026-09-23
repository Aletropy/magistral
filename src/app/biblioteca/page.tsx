import type { Metadata } from "next";
import { connection } from "next/server";
import { DeleteLibrarySourceButton } from "@/components/DeleteLibrarySourceButton";
import { LibrarySyncPanel } from "@/components/LibrarySyncPanel";
import { LibraryUploadForm } from "@/components/LibraryUploadForm";
import { LoadLibraryExamplesButton } from "@/components/LoadLibraryExamplesButton";
import { ReindexLibraryButton } from "@/components/ReindexLibraryButton";
import { WarningCallout } from "@/components/ui/WarningCallout";
import { getActiveEmbeddingIdentity } from "@/lib/llm/getEmbedder";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resolveLibraryDir } from "@/lib/rag/config";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { FULL_CONTEXT_MAX_CHARS } from "@/lib/rag/selectContext";
import { LIBRARY_INDEX_MISMATCH_MESSAGE } from "@/lib/rag/errors";
import { LIBRARY_SOURCE_KIND_LABELS } from "@/lib/rag/types";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { readTaskParam } from "@/lib/tasks/readTaskParam";
import type { TaskDetail, TaskKind } from "@/lib/tasks/types";
import { plural } from "@/lib/text/plural";
import { formatDateTime, formatInteger } from "@/lib/usage/format";

export const metadata: Metadata = { title: "Biblioteca jurídica" };

/** The library task the page was opened with (`?tarefa=`), for the component that started that kind. */
function taskOfKind(task: TaskDetail | null, kind: TaskKind): TaskDetail | null {
  return task?.kind === kind ? task : null;
}

export default async function LibraryPage({ searchParams }: PageProps<"/biblioteca">) {
  await connection();
  const taskId = readTaskParam(await searchParams);
  const task = taskId ? getTaskRepository().get(taskId) : null;
  const library = getLibraryRepository();
  const sources = library.listSources();
  const totalChars = library.totalChars();
  const indexInfo = library.indexInfo();
  const needsReindex = indexInfo.chunkCount > 0 && indexInfo.model !== getActiveEmbeddingIdentity().id;
  const strategy =
    totalChars <= FULL_CONTEXT_MAX_CHARS
      ? "é enviada inteira à IA a cada minuta."
      : "é grande: a IA recebe só os trechos mais relevantes para cada minuta.";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Biblioteca jurídica</h1>
        <p className="max-w-3xl text-muted-foreground">
          Leis, decretos e pareceres do Município para fundamentar as minutas sem inventar normas. Os
          documentos são divididos por artigo (com seus parágrafos e incisos) e indexados localmente.
        </p>
        {sources.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {plural(sources.length, "documento", "documentos")}, {plural(totalChars, "caractere", "caracteres")}. A
            biblioteca {strategy}
          </p>
        )}
      </header>

      {needsReindex && (
        <WarningCallout className="flex flex-col gap-3">
          <p>{LIBRARY_INDEX_MISMATCH_MESSAGE}</p>
          <ReindexLibraryButton initialTask={taskOfKind(task, "library.reindex")} />
        </WarningCallout>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <LibraryUploadForm initialTask={taskOfKind(task, "library.upload")} />
        <LibrarySyncPanel folder={resolveLibraryDir()} initialTask={taskOfKind(task, "library.sync")} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Origem</TableHead>
              <TableHead className="hidden text-right md:table-cell">Trechos</TableHead>
              <TableHead className="hidden text-right md:table-cell">Caracteres</TableHead>
              <TableHead className="hidden md:table-cell">Adicionado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="whitespace-normal text-muted-foreground">
                  <div className="flex flex-col items-start gap-3 py-4">
                    A biblioteca está vazia. Envie leis, decretos e pareceres, ou experimente com uma lei e um
                    decreto fictícios de exemplo.
                    <LoadLibraryExamplesButton initialTask={taskOfKind(task, "library.demo")} />
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="whitespace-normal">
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{source.title}</span>
                      <span className="break-all text-xs text-muted-foreground">{source.folderPath ?? source.fileName}</span>
                      <span className="text-xs text-muted-foreground md:hidden">
                        {LIBRARY_SOURCE_KIND_LABELS[source.kind]} · {plural(source.chunkCount, "trecho", "trechos")}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary">{LIBRARY_SOURCE_KIND_LABELS[source.kind]}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{source.folderPath ? "Pasta" : "Envio"}</TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{formatInteger(source.chunkCount)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{formatInteger(source.charCount)}</TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">{formatDateTime(source.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DeleteLibrarySourceButton
                        id={source.id}
                        title={source.title}
                        fromFolder={source.folderPath !== null}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
