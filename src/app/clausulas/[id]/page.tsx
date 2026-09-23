import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ClauseEditor } from "@/components/ClauseEditor";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";

export async function generateMetadata({ params }: PageProps<"/clausulas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = getClauseRepository().get(id);
  return { title: item ? `Editar ${item.title}` : "Cláusula" };
}

export default async function EditClausePage({ params }: PageProps<"/clausulas/[id]">) {
  await connection();
  const { id } = await params;
  const clause = getClauseRepository().get(id);
  if (!clause) notFound();

  const { title, category, documentTypes, body } = clause;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Editar “{title}”</h1>
      <ClauseEditor clauseId={id} initialValues={{ title, category, documentTypes, body }} />
    </main>
  );
}
