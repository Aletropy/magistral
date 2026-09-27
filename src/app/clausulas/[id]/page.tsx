import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ClauseEditor } from "@/components/ClauseEditor";
import { Page } from "@/components/layout/Page";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { requireUser } from "@/lib/auth/dal";

export async function generateMetadata({ params }: PageProps<"/clausulas/[id]">): Promise<Metadata> {
  await requireUser();
  const { id } = await params;
  const item = getClauseRepository().get(id);
  return { title: item ? `Editar ${item.title}` : "Cláusula" };
}

export default async function EditClausePage({ params }: PageProps<"/clausulas/[id]">) {
  await connection();
  await requireUser();
  const { id } = await params;
  const clause = getClauseRepository().get(id);
  if (!clause) notFound();

  const { title, category, documentTypes, body } = clause;

  return (
    <Page
      title={<>Editar “{title}”</>}
      width="default"
    >
      <ClauseEditor clauseId={id} initialValues={{ title, category, documentTypes, body }} />
    </Page>
  );
}
