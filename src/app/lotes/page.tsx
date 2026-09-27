import { Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BatchProgressBar } from "@/components/BatchProgressBar";
import { EmptyState } from "@/components/layout/EmptyState";
import { Page } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { NEW_BATCH_PATH, batchPath } from "@/lib/batch/paths";
import { isJobActive } from "@/lib/batch/types";
import { formatDateTime } from "@/lib/usage/format";

export const metadata: Metadata = { title: "Lotes" };

export default async function BatchesPage() {
  await connection();
  const user = await requireUser();
  const jobs = getBatchRepository().listJobs(user.id);

  return (
    <Page
      title="Geração em lote"
      width="wide"
      description={
        <>
          Uma minuta por linha de planilha (notificações, cobranças, termos), com a mesma persona e o mesmo modelo. A
          geração continua em segundo plano, mesmo depois de reiniciar o servidor.
        </>
      }
      actions={
        <>
          <Button asChild size="lg">
            <Link href={NEW_BATCH_PATH}>Novo lote</Link>
          </Button>
        </>
      }
    >
      {jobs.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum lote criado"
          description="Gere uma minuta por linha de uma planilha: notificações, cobranças ou termos em série."
          action={
            <Button asChild>
              <Link href={NEW_BATCH_PATH}>Criar o primeiro lote</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead className="hidden md:table-cell">Criado em</TableHead>
                <TableHead className="hidden w-80 md:table-cell">Progresso</TableHead>
                <TableHead className="hidden md:table-cell">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="whitespace-normal font-medium">
                    <Link href={batchPath(job.id)} className="text-primary hover:underline">
                      {job.name}
                    </Link>
                    <div className="mt-2 md:hidden">
                      <BatchProgressBar job={job} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">{formatDateTime(job.createdAt)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <BatchProgressBar job={job} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{isJobActive(job) ? "Em andamento" : "Concluído"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  );
}
