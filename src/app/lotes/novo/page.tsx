import type { Metadata } from "next";
import { connection } from "next/server";
import { BatchCreator } from "@/components/BatchCreator";
import { Page } from "@/components/layout/Page";
import { loadBatchPreflight } from "@/lib/batch/loadBatchPreflight";
import { loadMinutaFormOptions } from "@/lib/minuta/loadMinutaFormOptions";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Novo lote" };

export default async function NewBatchPage() {
  await connection();
  await requireUser();

  return (
    <Page
      title="Novo lote"
      width="wide"
      description={
        <>
          Use marcadores como <code className="rounded bg-muted px-1">{"{{nome}}"}</code> nos campos do modelo; cada
          linha da planilha preenche os marcadores com os seus valores.
        </>
      }
    >
      <BatchCreator {...loadMinutaFormOptions()} preflight={loadBatchPreflight()} />
    </Page>
  );
}
