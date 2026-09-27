import { FilePlus2, Layers, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ActiveWorkCard } from "@/components/dashboard/ActiveWorkCard";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DataPrivacyNotice } from "@/components/DataPrivacyNotice";
import { Page } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { NEW_BATCH_PATH } from "@/lib/batch/paths";
import { getChatRepository } from "@/lib/chat/getChatRepository";
import { ASSISTANT_PATH, conversationPath } from "@/lib/chat/paths";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { CLAUSES_PATH } from "@/lib/clauses/paths";
import { DRAFT_SUGGESTION_QUERY_PARAM } from "@/lib/minuta/paths";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { HISTORY_PATH, NEW_MINUTA_PATH, minutaPath } from "@/lib/minutas/paths";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { PERSONAS_PATH } from "@/lib/personas/paths";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { LIBRARY_PATH } from "@/lib/rag/paths";
import { TASK_QUERY_PARAM } from "@/lib/tasks/paths";
import { formatDateTime } from "@/lib/usage/format";

const RECENT_MINUTAS = 5;
const RECENT_CONVERSATIONS = 4;
/** Links saved in older notifications pointed the minuta form at "/"; they now open the workspace. */
const WORKSPACE_PARAMS = [TASK_QUERY_PARAM, DRAFT_SUGGESTION_QUERY_PARAM] as const;

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  await connection();
  const user = await requireUser();
  const params = await searchParams;
  const legacy = new URLSearchParams();
  for (const name of WORKSPACE_PARAMS) {
    const value = params[name];
    if (typeof value === "string") legacy.set(name, value);
  }
  if (legacy.size > 0) redirect(`${NEW_MINUTA_PATH}?${legacy}`);

  const minutas = getMinutaRepository().list(user.id).slice(0, RECENT_MINUTAS);
  const conversations = getChatRepository().list(user.id).slice(0, RECENT_CONVERSATIONS);
  const shared = [
    { label: "Personas", count: getPersonaRepository().list().length, href: PERSONAS_PATH },
    { label: "Cláusulas aprovadas", count: getClauseRepository().list().length, href: CLAUSES_PATH },
    { label: "Documentos na biblioteca", count: getLibraryRepository().listSources().length, href: LIBRARY_PATH },
  ];

  return (
    <Page
      title={`Olá, ${firstName(user.displayName)}`}
      description="Comece uma minuta, continue uma conversa ou acompanhe o que está rodando."
      width="wide"
      actions={
        <>
          <Button asChild variant="outline">
            <Link href={NEW_BATCH_PATH}>
              <Layers aria-hidden /> Novo lote
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ASSISTANT_PATH}>
              <MessagesSquare aria-hidden /> Advogado IA
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href={NEW_MINUTA_PATH}>
              <FilePlus2 aria-hidden /> Nova minuta
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <DashboardCard title="Minutas recentes" href={HISTORY_PATH} linkLabel="Ver histórico">
            {minutas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma minuta ainda.{" "}
                <Link href={NEW_MINUTA_PATH} className="text-primary hover:underline">
                  Gere a primeira
                </Link>
                .
              </p>
            ) : (
              <ul className="-my-2 divide-y">
                {minutas.map((minuta) => (
                  <li key={minuta.id}>
                    <Link href={minutaPath(minuta.id)} className="group flex flex-col gap-0.5 py-2.5">
                      <span className="font-medium group-hover:text-primary group-hover:underline">{minuta.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {minuta.documentTypeLabel} · {minuta.personaName} · {formatDateTime(minuta.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>

          <DashboardCard title="Conversas com o Advogado IA" href={ASSISTANT_PATH} linkLabel="Abrir o Advogado IA">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tire dúvidas, planeje uma minuta ou consulte a biblioteca numa conversa.
              </p>
            ) : (
              <ul className="-my-2 divide-y">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Link href={conversationPath(conversation.id)} className="group flex flex-col gap-0.5 py-2.5">
                      <span className="font-medium group-hover:text-primary group-hover:underline">
                        {conversation.title}
                      </span>
                      {conversation.preview && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">{conversation.preview}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>

        <div className="flex flex-col gap-4">
          <ActiveWorkCard />
          <DashboardCard title="Acervo do escritório">
            <ul className="flex flex-col gap-2">
              {shared.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="flex items-center justify-between gap-3 text-sm hover:text-primary">
                    <span>{item.label}</span>
                    <span className="font-semibold tabular-nums">{item.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </DashboardCard>
          <DataPrivacyNotice />
        </div>
      </div>
    </Page>
  );
}
