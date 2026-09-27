import type { Metadata } from "next";
import { connection } from "next/server";
import { AssistantShell } from "@/components/chat/AssistantShell";
import { NewConversation } from "@/components/chat/NewConversation";
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
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Advogado IA</h1>
        <p className="max-w-2xl text-muted-foreground">
          Tire dúvidas, planeje minutas e consulte a sua biblioteca jurídica numa conversa. Tudo fica salvo aqui.
        </p>
      </header>
      <AssistantShell conversations={conversations}>
        <NewConversation librarySourceCount={librarySourceCount} />
      </AssistantShell>
    </main>
  );
}
