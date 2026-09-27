import type { Metadata } from "next";
import { connection } from "next/server";
import { BatchCreator } from "@/components/BatchCreator";
import { loadMinutaFormOptions } from "@/lib/minuta/loadMinutaFormOptions";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Novo lote" };

export default async function NewBatchPage() {
  await connection();
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Novo lote</h1>
        <p className="max-w-3xl text-muted-foreground">
          Use marcadores como <code className="rounded bg-muted px-1">{"{{nome}}"}</code> nos campos do modelo;
          cada linha da planilha preenche os marcadores com os seus valores.
        </p>
      </header>
      <BatchCreator {...loadMinutaFormOptions()} />
    </main>
  );
}
