import Link from "next/link";
import { connection } from "next/server";
import { BatchProgressBar } from "@/components/BatchProgressBar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { NEW_BATCH_PATH, batchPath } from "@/lib/batch/paths";
import { isJobActive } from "@/lib/batch/types";
import { formatDateTime } from "@/lib/usage/format";

export default async function BatchesPage() {
  await connection();
  const jobs = getBatchRepository().listJobs();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Geração em lote</h1>
          <p className="max-w-2xl text-muted-foreground">
            Uma minuta por linha de planilha (notificações, cobranças, termos), com a mesma persona e o mesmo
            modelo. A geração continua em segundo plano, mesmo depois de reiniciar o servidor.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href={NEW_BATCH_PATH}>Novo lote</Link>
        </Button>
      </header>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-80">Progresso</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum lote criado.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    <Link href={batchPath(job.id)} className="text-primary hover:underline">
                      {job.name}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(job.createdAt)}</TableCell>
                  <TableCell>
                    <BatchProgressBar job={job} />
                  </TableCell>
                  <TableCell>{isJobActive(job) ? "Em andamento" : "Concluído"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
