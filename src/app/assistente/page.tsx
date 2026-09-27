import type { Metadata } from "next";
import { connection } from "next/server";
import { AssistantShell } from "@/components/chat/AssistantShell";
import { NewConversation } from "@/components/chat/NewConversation";
import { Page } from "@/components/layout/Page";
import { requireUser } from "@/lib/auth/dal";
import { getChatRepository } from "@/lib/chat/getChatRepository";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";

export const metadata: Metadata = { title: "Advogado IA" };

export default async function AssistantPage() {
  await connection();
  const user = await requireUser();
  const conversations = getChatRepository().list(user.id);
  const librarySourceCount = getLibraryRepository().listSources().length;

  return (
    <Page
      title="Advogado IA"
      width="wide"
      description={
        <>
          Tire dúvidas, planeje minutas e consulte a sua biblioteca jurídica numa conversa. Tudo fica salvo aqui.
        </>
      }
    >
      <AssistantShell conversations={conversations}>
        <NewConversation librarySourceCount={librarySourceCount} />
      </AssistantShell>
    </Page>
  );
}
