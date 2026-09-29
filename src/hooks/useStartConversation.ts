"use client";

import { useState } from "react";
import { useActivity } from "@/components/activity/ActivityProvider";
import type { NewConversationInput } from "@/lib/chat/schema";
import { NETWORK_ERROR_MESSAGE, postJson, readErrorMessage } from "@/lib/http/client";
import type { ConversationCreatedResponseBody } from "@/lib/http/contracts";
import { CONVERSATIONS_ENDPOINT } from "@/lib/http/endpoints";

const START_FAILED = "Não foi possível iniciar a conversa. Tente novamente.";

/** Starts a conversation with its first question; `onStarted` gets the new conversation's id. */
export function useStartConversation(onStarted: (conversationId: string) => void) {
  const { refresh: refreshActivity } = useActivity();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Resolves to whether the conversation started, so the composer keeps the text when it didn't. */
  async function start(body: NewConversationInput): Promise<boolean> {
    setIsSending(true);
    setError(null);
    try {
      const response = await postJson(CONVERSATIONS_ENDPOINT, body);
      if (!response.ok) {
        setError(await readErrorMessage(response, START_FAILED));
        return false;
      }
      const { conversationId } = (await response.json()) as ConversationCreatedResponseBody;
      refreshActivity();
      onStarted(conversationId);
      return true;
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      return false;
    } finally {
      setIsSending(false);
    }
  }

  return { start, isSending, error };
}
