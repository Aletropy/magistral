import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AssistantShell } from "@/components/chat/AssistantShell";
import { ChatThread } from "@/components/chat/ChatThread";
import { getChatRepository } from "@/lib/chat/getChatRepository";

export async function generateMetadata({ params }: PageProps<"/assistente/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getChatRepository().get(id)?.title ?? "Advogado IA" };
}

export default async function ConversationPage({ params }: PageProps<"/assistente/[id]">) {
  await connection();
  const { id } = await params;
  const chats = getChatRepository();
  const conversation = chats.get(id);
  if (!conversation) notFound();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pt-10 sm:px-8">
      <AssistantShell conversations={chats.list()} activeId={id}>
        {/* Keyed so opening another conversation starts from its own state. */}
        <ChatThread key={conversation.id} initial={conversation} />
      </AssistantShell>
    </main>
  );
}
