"use client";

import { MessagesSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActivity } from "@/components/activity/ActivityProvider";
import { Button } from "@/components/ui/button";
import { conversationPath } from "@/lib/chat/paths";
import type { NewConversationInput } from "@/lib/chat/schema";
import { NETWORK_ERROR_MESSAGE, postJson, readErrorMessage } from "@/lib/http/client";
import type { ConversationCreatedResponseBody } from "@/lib/http/contracts";
import { CONVERSATIONS_ENDPOINT } from "@/lib/http/endpoints";

const FIRST_QUESTION = "Revise esta minuta: aponte riscos, lacunas e cláusulas que poderiam ser melhoradas.";
const START_FAILED = "Não foi possível abrir a conversa. Tente novamente.";

/** Opens a conversation with the Advogado IA about a saved minuta, starting with a review request. */
export function DiscussMinutaButton({ minutaId }: { minutaId: string }) {
  const router = useRouter();
  const { refresh: refreshActivity } = useActivity();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setIsStarting(true);
    setError(null);
    try {
      const body: NewConversationInput = { message: FIRST_QUESTION, minutaId, useLibrary: true };
      const response = await postJson(CONVERSATIONS_ENDPOINT, body);
      if (!response.ok) {
        setError(await readErrorMessage(response, START_FAILED));
        return;
      }
      const { conversationId } = (await response.json()) as ConversationCreatedResponseBody;
      refreshActivity();
      router.push(conversationPath(conversationId));
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" disabled={isStarting} onClick={() => void start()}>
        <MessagesSquare aria-hidden /> {isStarting ? "Abrindo conversa…" : "Conversar com o Advogado IA"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
