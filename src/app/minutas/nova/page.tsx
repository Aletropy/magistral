import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Page } from "@/components/layout/Page";
import { MinutaStudio } from "@/components/MinutaStudio";
import { requireUser } from "@/lib/auth/dal";
import { ASSISTANT_PATH } from "@/lib/chat/paths";
import { loadDraftTaskState } from "@/lib/minuta/loadDraftTaskState";
import { loadMinutaFormOptions } from "@/lib/minuta/loadMinutaFormOptions";
import { DRAFT_SUGGESTION_QUERY_PARAM } from "@/lib/minuta/paths";
import { minutaPath } from "@/lib/minutas/paths";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { readTaskParam } from "@/lib/tasks/readTaskParam";

export const metadata: Metadata = { title: "Nova minuta" };

export default async function NewMinutaPage({ searchParams }: PageProps<"/minutas/nova">) {
  await connection();
  const user = await requireUser();
  const params = await searchParams;
  const draft = loadDraftTaskState(readTaskParam(params), user.id);
  // A draft that already finished opens its review page.
  if (draft.kind === "finished") redirect(minutaPath(draft.minutaId));
  const suggestionId = readTaskParam(params, DRAFT_SUGGESTION_QUERY_PARAM);
  const suggestion = suggestionId ? getTaskRepository().get(suggestionId, user.id) : null;

  return (
    <Page
      title="Nova minuta"
      width="wide"
      description={
        <>
          Parta do zero ou de um documento base, escolha o tom de voz e receba a minuta pronta para revisar e baixar
          em Word ou PDF. Dúvidas sobre o que pedir?{" "}
          <Link href={ASSISTANT_PATH} className="text-primary hover:underline">
            Converse com o Advogado IA
          </Link>
          .
        </>
      }
    >
      <MinutaStudio
        userId={user.id}
        {...loadMinutaFormOptions()}
        initialTask={draft.kind === "following" ? draft.task : null}
        initialSuggestion={suggestion?.kind === "minuta.extract" ? suggestion : null}
      />
    </Page>
  );
}
