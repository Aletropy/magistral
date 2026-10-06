"use client";

import { useCallback, useState } from "react";
import { useActivity } from "@/components/activity/ActivityProvider";
import type { ChatConversation } from "@/lib/chat/types";
import { NETWORK_ERROR_MESSAGE, postJson, readErrorMessage, sendJson } from "@/lib/http/client";
import type { ConversationResponseBody } from "@/lib/http/contracts";
import {
  conversationEndpoint,
  conversationMessagesEndpoint,
  conversationStepEndpoint,
  replyRetryEndpoint,
  taskCancelEndpoint,
} from "@/lib/http/endpoints";
import type { PageContextInput } from "@/lib/assistant/pageContext";
import type { StepDecision } from "@/lib/assistant/stepDecisions";
import type { ChatMessageInput } from "@/lib/chat/schema";
import { useLiveRefresh } from "./useLiveRefresh";

/** How often a conversation waiting for a reply is refreshed while the event stream is down. */
export const CONVERSATION_POLL_INTERVAL_MS = 2000;

const SEND_FAILED = "Não foi possível enviar a mensagem. Tente novamente.";
const UPDATE_FAILED = "Não foi possível atualizar a conversa. Tente novamente.";
const DECISION_FAILED = "Não foi possível registrar sua decisão. Tente novamente.";

/** One conversation with the Advogado IA: follows pending replies and sends, retries and cancels them. */
export interface ConversationOptions {
  /** The page a message is sent from, read at send time (the assistant panel). */
  getContext?: () => PageContextInput | null;
}

export function useConversation(initial: ChatConversation, { getContext }: ConversationOptions = {}) {
  const { refresh: refreshActivity } = useActivity();
  const [conversation, setConversation] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { id, isReplying } = conversation;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(conversationEndpoint(id), { cache: "no-store" });
      if (!response.ok) return;
      const latest = ((await response.json()) as ConversationResponseBody).conversation;
      setConversation(latest);
      if (!latest.isReplying) refreshActivity();
    } catch {
      // The next poll tries again.
    }
  }, [id, refreshActivity]);

  useLiveRefresh(refresh, isReplying, CONVERSATION_POLL_INTERVAL_MS);

  /** Runs a request that changes the conversation, then reloads it; resolves to whether it worked. */
  const act = useCallback(
    async (request: () => Promise<Response>, failure: string) => {
      setError(null);
      try {
        const response = await request();
        if (!response.ok) {
          setError(await readErrorMessage(response, failure));
          return false;
        }
        await refresh();
        refreshActivity();
        return true;
      } catch {
        setError(NETWORK_ERROR_MESSAGE);
        return false;
      }
    },
    [refresh, refreshActivity],
  );

  const send = useCallback(
    async (message: string) => {
      setIsSending(true);
      try {
        const body: ChatMessageInput = { message, context: getContext?.() ?? null };
        return await act(() => postJson(conversationMessagesEndpoint(id), body), SEND_FAILED);
      } finally {
        setIsSending(false);
      }
    },
    [act, id, getContext],
  );

  const retry = useCallback(
    (messageId: number) => act(() => fetch(replyRetryEndpoint(id, messageId), { method: "POST" }), SEND_FAILED),
    [act, id],
  );

  const cancel = useCallback(
    (taskId: string) => act(() => fetch(taskCancelEndpoint(taskId), { method: "POST" }), UPDATE_FAILED),
    [act],
  );

  const update = useCallback(
    (changes: { title?: string; useLibrary?: boolean; useJurisprudencia?: boolean }) =>
      act(() => sendJson("PATCH", conversationEndpoint(id), changes), UPDATE_FAILED),
    [act, id],
  );

  /** Confirms or rejects an action the assistant proposed; the assistant then replies with the outcome. */
  const decide = useCallback(
    (stepId: number, decision: StepDecision) =>
      act(() => postJson(conversationStepEndpoint(id, stepId), { decision }), DECISION_FAILED),
    [act, id],
  );

  return { conversation, error, isSending, send, retry, cancel, update, decide };
}
