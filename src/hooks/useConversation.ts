"use client";

import { useCallback, useEffect, useState } from "react";
import { useActivity } from "@/components/activity/ActivityProvider";
import type { ChatConversation } from "@/lib/chat/types";
import {
  NETWORK_ERROR_MESSAGE,
  conversationEndpoint,
  conversationMessagesEndpoint,
  postJson,
  readErrorMessage,
  replyRetryEndpoint,
  sendJson,
  taskCancelEndpoint,
  type ConversationResponseBody,
} from "@/lib/http/api";

/** How often a conversation waiting for a reply is refreshed. */
export const CONVERSATION_POLL_INTERVAL_MS = 2000;

const SEND_FAILED = "Não foi possível enviar a mensagem. Tente novamente.";
const UPDATE_FAILED = "Não foi possível atualizar a conversa. Tente novamente.";

/** One conversation with the Advogado IA: follows pending replies and sends, retries and cancels them. */
export function useConversation(initial: ChatConversation) {
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

  useEffect(() => {
    if (!isReplying) return;
    const timer = setInterval(() => void refresh(), CONVERSATION_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isReplying, refresh]);

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
        return await act(() => postJson(conversationMessagesEndpoint(id), { message }), SEND_FAILED);
      } finally {
        setIsSending(false);
      }
    },
    [act, id],
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
    (changes: { title?: string; useLibrary?: boolean }) =>
      act(() => sendJson("PATCH", conversationEndpoint(id), changes), UPDATE_FAILED),
    [act, id],
  );

  return { conversation, error, isSending, send, retry, cancel, update };
}
