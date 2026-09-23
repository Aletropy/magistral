"use client";

import { FileSignature, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBackgroundTask } from "@/hooks/useBackgroundTask";
import { useConversation } from "@/hooks/useConversation";
import { MAX_CHAT_TITLE_CHARS } from "@/lib/chat/schema";
import type { ChatConversation } from "@/lib/chat/types";
import { DRAFT_SUGGESTIONS_ENDPOINT, postJson } from "@/lib/http/api";
import { draftSuggestionResultSchema } from "@/lib/minuta/draftSuggestion";
import { draftSuggestionPath } from "@/lib/minuta/paths";
import { minutaPath } from "@/lib/minutas/paths";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageView } from "./ChatMessageView";
import { DeleteConversationButton } from "./DeleteConversationButton";

const DRAFT_FAILED = "Não foi possível preparar a minuta. Tente novamente.";

function TitleEditor({ title, onSave }: { title: string; onSave: (title: string) => Promise<boolean> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim() && (await onSave(draft.trim()))) setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Renomear conversa"
          onClick={() => {
            setDraft(title);
            setIsEditing(true);
          }}
        >
          <Pencil className="size-3.5" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={(event) => void handleSubmit(event)}>
      <Input
        aria-label="Título da conversa"
        autoFocus
        maxLength={MAX_CHAT_TITLE_CHARS}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <Button type="submit" size="sm">
        Salvar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
        Cancelar
      </Button>
    </form>
  );
}

/** A conversation with the Advogado IA: its messages, the composer and the hand-off to the minuta wizard. */
export function ChatThread({ initial }: { initial: ChatConversation }) {
  const router = useRouter();
  const { conversation, error, isSending, send, retry, cancel, update } = useConversation(initial);
  // The wizard opens with the result, so the chat's own URL doesn't need to remember the task.
  const handOff = useBackgroundTask(draftSuggestionResultSchema, null, { queryParam: null });
  const endRef = useRef<HTMLDivElement>(null);
  const messageCount = conversation.messages.length;
  const hasAnswers = conversation.messages.some((message) => message.role === "assistant" && message.status === "done");
  const { taskId: handOffTaskId, result: handOffResult } = handOff;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount, conversation.isReplying]);

  // Once the conversation is read into a minuta form, open the wizard with it.
  useEffect(() => {
    if (handOffTaskId && handOffResult) router.push(draftSuggestionPath(handOffTaskId));
  }, [handOffTaskId, handOffResult, router]);

  function createMinuta() {
    const body = { source: "conversation", conversationId: conversation.id };
    void handOff.start(() => postJson(DRAFT_SUGGESTIONS_ENDPOINT, body), DRAFT_FAILED);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-3 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <TitleEditor title={conversation.title} onSave={(title) => update({ title })} />
            {conversation.minutaId && (
              <p className="text-sm text-muted-foreground">
                Sobre a minuta{" "}
                <Link href={minutaPath(conversation.minutaId)} className="text-primary hover:underline">
                  {conversation.minutaTitle ?? "do histórico"}
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hasAnswers || handOff.isBusy}
              title={hasAnswers ? undefined : "Converse um pouco antes: a minuta sai do que foi combinado."}
              onClick={createMinuta}
            >
              <FileSignature aria-hidden />
              {handOff.isBusy ? "Preparando a minuta…" : "Criar minuta a partir desta conversa"}
            </Button>
            <DeleteConversationButton id={conversation.id} title={conversation.title} />
          </div>
        </div>
        {handOff.startError && <p className="text-sm text-destructive">{handOff.startError}</p>}
        <FollowedTaskStatus background={handOff} runningTitle="Lendo a conversa para preencher a minuta" />
      </header>

      <div className="flex flex-col gap-4" aria-live="polite">
        {conversation.messages.map((message) => (
          <ChatMessageView
            key={message.id}
            message={message}
            onRetry={(id) => void retry(id)}
            onCancel={(taskId) => void cancel(taskId)}
          />
        ))}
        <div ref={endRef} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 bg-background pt-2 pb-4">
        <ChatComposer
          disabled={conversation.isReplying}
          isSending={isSending}
          onSend={send}
          footer={
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={conversation.useLibrary}
                onChange={(event) => void update({ useLibrary: event.target.checked })}
              />
              Consultar a biblioteca jurídica
            </label>
          }
        />
      </div>
    </div>
  );
}
