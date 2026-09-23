import { connection } from "next/server";
import { DeleteLibrarySourceButton } from "@/components/DeleteLibrarySourceButton";
import { LibrarySyncPanel } from "@/components/LibrarySyncPanel";
import { LibraryUploadForm } from "@/components/LibraryUploadForm";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resolveLibraryDir } from "@/lib/rag/config";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { FULL_CONTEXT_MAX_CHARS } from "@/lib/rag/selectContext";
import { LIBRARY_SOURCE_KIND_LABELS } from "@/lib/rag/types";
import { formatDateTime, formatInteger } from "@/lib/usage/format";

export default async function LibraryPage() {
  await connection();
  const library = getLibraryRepository();
  const sources = library.listSources();
  const totalChars = library.totalChars();
  const strategy =
    totalChars <= FULL_CONTEXT_MAX_CHARS
      ? "cabe inteira no contexto da IA (recuperação completa)"
      : "é consultada por busca híbrida (palavras-chave + semântica)";

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
            {formatInteger(sources.length)} documento(s), {formatInteger(totalChars)} caracteres: a biblioteca{" "}
            {strategy}.
          </p>
        )}
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <LibraryUploadForm />
        <LibrarySyncPanel folder={resolveLibraryDir()} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Trechos</TableHead>
              <TableHead className="text-right">Caracteres</TableHead>
              <TableHead>Adicionado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  A biblioteca está vazia.
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <span className="flex flex-col">
                      <span className="font-medium">{source.title}</span>
                      <span className="text-xs text-muted-foreground">{source.folderPath ?? source.fileName}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{LIBRARY_SOURCE_KIND_LABELS[source.kind]}</Badge>
                  </TableCell>
                  <TableCell>{source.folderPath ? "Pasta" : "Envio"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInteger(source.chunkCount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInteger(source.charCount)}</TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(source.createdAt)}</TableCell>
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
