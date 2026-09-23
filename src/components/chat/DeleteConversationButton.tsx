"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { useResourceMutations } from "@/hooks/useResourceMutations";
import { ASSISTANT_PATH } from "@/lib/chat/paths";
import { CONVERSATIONS_ENDPOINT, conversationEndpoint } from "@/lib/http/api";

const ENDPOINTS = { collection: CONVERSATIONS_ENDPOINT, item: conversationEndpoint };
const MESSAGES = {
  saveFailed: "Não foi possível salvar a conversa.",
  deleteFailed: "Não foi possível excluir a conversa. Tente novamente.",
};

export function DeleteConversationButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { isPending, error, remove } = useResourceMutations<never>(ENDPOINTS, MESSAGES);

  async function handleConfirm() {
    if (!(await remove(id))) return;
    router.push(ASSISTANT_PATH);
    router.refresh();
  }

  return (
    <ConfirmDeleteButton
      title={`Excluir a conversa “${title}”?`}
      description="As mensagens serão apagadas. Minutas criadas a partir dela continuam no histórico."
      isPending={isPending}
      error={error}
      onConfirm={() => void handleConfirm()}
    />
  );
}
