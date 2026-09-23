import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DeleteMinutaButton } from "@/components/DeleteMinutaButton";
import { SavedMinutaView } from "@/components/SavedMinutaView";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { formatDateTime } from "@/lib/usage/format";

export async function generateMetadata({ params }: PageProps<"/historico/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getMinutaRepository().get(id)?.title ?? "Minuta" };
}

export default async function SavedMinutaPage({ params }: PageProps<"/historico/[id]">) {
  await connection();
  const { id } = await params;
  const minuta = getMinutaRepository().get(id);
  if (!minuta) notFound();

  const edited = minuta.updatedAt !== minuta.createdAt;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{minuta.title}</h1>
          <p className="text-sm text-muted-foreground">
            {minuta.documentTypeLabel} · persona {minuta.personaName} · gerada em {formatDateTime(minuta.createdAt)}
            {edited && ` · revisada em ${formatDateTime(minuta.updatedAt)}`}
          </p>
        </div>
        <DeleteMinutaButton id={minuta.id} title={minuta.title} leavePage />
      </header>
      <SavedMinutaView initial={{ ...minuta.result, id: minuta.id }} />
    </main>
  );
}
