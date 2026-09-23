import Link from "next/link";
import { connection } from "next/server";
import { DeleteClauseButton } from "@/components/DeleteClauseButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { NEW_CLAUSE_PATH, clauseEditPath } from "@/lib/clauses/paths";
import { DOCUMENT_TYPE_LABELS } from "@/lib/minuta/documentTypes";

export default async function ClausesPage() {
  await connection();
  const clauses = getClauseRepository().list();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca de cláusulas</h1>
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
              <TableHead>Categoria</TableHead>
              <TableHead>Tipos de documento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clauses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhuma cláusula cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              clauses.map((clause) => (
                <TableRow key={clause.id}>
                  <TableCell className="font-medium">{clause.title}</TableCell>
                  <TableCell className="text-muted-foreground">{clause.category}</TableCell>
                  <TableCell>
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
                    <div className="flex items-start justify-end gap-2">
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
