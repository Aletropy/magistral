"use client";

import { Maximize2, MessageSquarePlus, Scale, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatThread } from "@/components/chat/ChatThread";
import { Button } from "@/components/ui/button";
import { useStartConversation } from "@/hooks/useStartConversation";
import { conversationPath } from "@/lib/chat/paths";
import type { ChatConversation, ChatConversationSummary } from "@/lib/chat/types";
import type { ConversationResponseBody, ConversationsResponseBody } from "@/lib/http/contracts";
import { CONVERSATIONS_ENDPOINT, conversationEndpoint } from "@/lib/http/endpoints";
import { HTTP_NOT_FOUND } from "@/lib/http/status";
import { useAssistantPanel } from "./AssistantProvider";

export const PANEL_ID = "painel-advogado-ia";
/** Conversations offered to continue when the panel starts empty. */
const RECENT_CONVERSATIONS = 5;
const LOAD_FAILED = "Não foi possível abrir a conversa. Tente novamente.";

const PANEL_SUGGESTIONS = [
  "O que posso fazer nesta página?",
  "Resuma a minuta que estou vendo e aponte os riscos.",
  "Quero começar uma minuta nova. Do que você precisa?",
];

type LoadState =
  | { status: "loading" }
  | { status: "ready"; conversation: ChatConversation }
  | { status: "failed"; message: string };

/** The remembered conversation, loaded when the panel opens; a deleted one starts the panel over. */
function PanelConversation({ id }: { id: string }) {
  const { setConversationId, currentContext } = useAssistantPanel();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetch(conversationEndpoint(id), { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === HTTP_NOT_FOUND) return setConversationId(null);
        if (!response.ok) return setState({ status: "failed", message: LOAD_FAILED });
        const { conversation } = (await response.json()) as ConversationResponseBody;
        if (active) setState({ status: "ready", conversation });
      })
      .catch(() => active && setState({ status: "failed", message: LOAD_FAILED }));
    return () => {
      active = false;
    };
  }, [id, setConversationId]);

  if (state.status === "loading") return <p className="p-4 text-sm text-muted-foreground" role="status">Abrindo a conversa…</p>;
  if (state.status === "failed") return <p className="p-4 text-sm text-destructive">{state.message}</p>;
  return (
    <div className="flex flex-col gap-3 px-4 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium">{state.conversation.title}</p>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href={conversationPath(id)}>
            <Maximize2 aria-hidden /> Tela cheia
          </Link>
        </Button>
      </div>
      <ChatThread key={id} initial={state.conversation} compact getContext={currentContext} />
    </div>
  );
}

/** An empty panel: the first question, a few ideas, and the latest conversations to pick up. */
function PanelStart() {
  const { setConversationId, currentContext } = useAssistantPanel();
  const [text, setText] = useState("");
  const [recent, setRecent] = useState<ChatConversationSummary[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { start, isSending, error } = useStartConversation(setConversationId);

  useEffect(() => {
    textareaRef.current?.focus();
    let active = true;
    fetch(CONVERSATIONS_ENDPOINT, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const { conversations } = (await response.json()) as ConversationsResponseBody;
        if (active) setRecent(conversations.slice(0, RECENT_CONVERSATIONS));
      })
      .catch(() => {
        // The list is a convenience; the panel works without it.
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-muted-foreground">
        Pergunte sobre esta página, peça uma minuta ou uma revisão. Eu consulto seus dados e peço sua confirmação
        antes de gerar ou alterar qualquer coisa.
      </p>
      <div className="flex flex-wrap gap-2">
        {PANEL_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="rounded-full border bg-card px-3 py-1.5 text-left text-xs hover:bg-muted"
            onClick={() => setText(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <ChatComposer
        disabled={false}
        isSending={isSending}
        value={text}
        onValueChange={setText}
        textareaRef={textareaRef}
        onSend={(message) => start({ message, context: currentContext() })}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Continuar uma conversa</h3>
          <ul className="flex flex-col divide-y rounded-lg border">
            {recent.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/50"
                  onClick={() => setConversationId(conversation.id)}
                >
                  <span className="truncate text-sm font-medium">{conversation.title}</span>
                  {conversation.preview && (
                    <span className="line-clamp-1 text-xs text-muted-foreground">{conversation.preview}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * The Advogado IA beside any page: it continues the last conversation (or starts one) and sends what the
 * page shows with each question. It doesn't block the page, so the user can keep working next to it.
 */
export function AssistantPanel() {
  const { isOpen, close, conversationId, setConversationId } = useAssistantPanel();
  if (!isOpen) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") close();
  }

  return (
    <aside
      id={PANEL_ID}
      aria-label="Advogado IA"
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l bg-background shadow-xl sm:w-[28rem]"
      onKeyDown={handleKeyDown}
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
          <Scale className="size-4" />
        </span>
        <h2 className="font-semibold tracking-tight">Advogado IA</h2>
        <div className="ml-auto flex items-center gap-1">
          {conversationId && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConversationId(null)}>
              <MessageSquarePlus aria-hidden /> Nova
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar o Advogado IA" onClick={close}>
            <X aria-hidden />
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {conversationId ? <PanelConversation key={conversationId} id={conversationId} /> : <PanelStart />}
      </div>
    </aside>
  );
}
