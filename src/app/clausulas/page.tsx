import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DeleteClauseButton } from "@/components/DeleteClauseButton";
import { LoadExamplesButton } from "@/components/LoadExamplesButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { NEW_CLAUSE_PATH, clauseEditPath } from "@/lib/clauses/paths";
import { DEMO_CLAUSES_ENDPOINT } from "@/lib/http/api";
import { DOCUMENT_TYPE_LABELS } from "@/lib/minuta/documentTypes";

export const metadata: Metadata = { title: "Cláusulas aprovadas" };

export default async function ClausesPage() {
  await connection();
  const clauses = getClauseRepository().list();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Cláusulas aprovadas</h1>
          <p className="max-w-2xl text-muted-foreground">
            Cláusulas pré-aprovadas para montar minutas. Escolha e ordene as cláusulas no formulário; a
            IA só ajusta o tom e completa o restante do documento.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href={NEW_CLAUSE_PATH}>Nova cláusula</Link>
        </Button>
      </header>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead className="hidden md:table-cell">Tipos de documento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clauses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="whitespace-normal text-muted-foreground">
                  <div className="flex flex-col items-start gap-3 py-4">
                    Nenhuma cláusula cadastrada. Crie a sua ou comece com exemplos prontos (foro, multa, sigilo e
                    reajuste).
                    <LoadExamplesButton
                      endpoint={DEMO_CLAUSES_ENDPOINT}
                      label="Carregar exemplos"
                      pendingLabel="Carregando…"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clauses.map((clause) => (
                <TableRow key={clause.id}>
                  <TableCell className="whitespace-normal font-medium">
                    {clause.title}
                    {clause.category && (
                      <span className="mt-1 block text-xs font-normal text-muted-foreground md:hidden">
                        {clause.category}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{clause.category}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {clause.documentTypes.length === 0 ? (
                        <Badge variant="secondary">Todos</Badge>
                      ) : (
                        clause.documentTypes.map((type) => (
                          <Badge key={type} variant="outline">
                            {DOCUMENT_TYPE_LABELS[type]}
                          </Badge>
                        ))
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={clauseEditPath(clause.id)}>Editar</Link>
                      </Button>
                      <DeleteClauseButton id={clause.id} title={clause.title} />
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
