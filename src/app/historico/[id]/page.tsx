import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AssistantContext } from "@/components/assistant/AssistantContext";
import { DiscussMinutaButton } from "@/components/chat/DiscussMinutaButton";
import { DeleteMinutaButton } from "@/components/DeleteMinutaButton";
import { Page } from "@/components/layout/Page";
import { SavedMinutaView } from "@/components/SavedMinutaView";
import { requireUser } from "@/lib/auth/dal";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { HISTORY_PATH } from "@/lib/minutas/paths";
import { formatDateTime } from "@/lib/usage/format";

export async function generateMetadata({ params }: PageProps<"/historico/[id]">): Promise<Metadata> {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  return { title: getMinutaRepository().get(id, user.id)?.title ?? "Minuta" };
}

export default async function SavedMinutaPage({ params }: PageProps<"/historico/[id]">) {
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const minuta = getMinutaRepository().get(id, user.id);
  if (!minuta) notFound();

  const edited = minuta.updatedAt !== minuta.createdAt;

  return (
    <Page
      width="wide"
      eyebrow={
        <Link href={HISTORY_PATH} className="hover:text-primary hover:underline">
          ← Histórico
        </Link>
      }
      title={minuta.title}
      description={
        <>
          {minuta.documentTypeLabel} · persona {minuta.personaName} · gerada em {formatDateTime(minuta.createdAt)}
          {edited && ` · revisada em ${formatDateTime(minuta.updatedAt)}`}
        </>
      }
      actions={
        <>
          <DiscussMinutaButton minutaId={minuta.id} />
          <DeleteMinutaButton id={minuta.id} title={minuta.title} leavePage />
        </>
      }
    >
      <AssistantContext kind="minuta" id={minuta.id} />
      <SavedMinutaView initial={{ ...minuta.result, id: minuta.id }} />
    </Page>
  );
}
