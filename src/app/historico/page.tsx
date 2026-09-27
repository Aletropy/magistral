import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DeleteMinutaButton } from "@/components/DeleteMinutaButton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { HOME_PATH, minutaPath } from "@/lib/minutas/paths";
import { formatDateTime } from "@/lib/usage/format";

export const metadata: Metadata = { title: "Histórico" };

export default async function HistoryPage() {
  await connection();
  const user = await requireUser();
  const minutas = getMinutaRepository().list(user.id);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
        <p className="max-w-2xl text-muted-foreground">
          Todas as minutas geradas ficam aqui para reabrir, revisar e baixar de novo. Minutas de lotes ficam
          em Lotes.
        </p>
      </header>

      {minutas.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          Nenhuma minuta gerada ainda.
          <Button asChild>
            <Link href={HOME_PATH}>Gerar a primeira minuta</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Minuta</TableHead>
                <TableHead className="hidden md:table-cell">Persona</TableHead>
                <TableHead className="hidden md:table-cell">Gerada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {minutas.map((minuta) => (
                <TableRow key={minuta.id}>
                  <TableCell className="whitespace-normal">
                    <Link href={minutaPath(minuta.id)} className="font-medium text-primary hover:underline">
                      {minuta.title}
                    </Link>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {minuta.documentTypeLabel}
                      <span className="md:hidden">
                        {" "}
                        · {minuta.personaName} · {formatDateTime(minuta.createdAt)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{minuta.personaName}</TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">{formatDateTime(minuta.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={minutaPath(minuta.id)}>Abrir</Link>
                      </Button>
                      <DeleteMinutaButton id={minuta.id} title={minuta.title} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
