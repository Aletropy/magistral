"use client";

import { Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActivity } from "@/components/activity/ActivityProvider";
import { conversationPath } from "@/lib/chat/paths";
import type { NewConversationInput } from "@/lib/chat/schema";
import { NETWORK_ERROR_MESSAGE, postJson, readErrorMessage } from "@/lib/http/client";
import type { ConversationCreatedResponseBody } from "@/lib/http/contracts";
import { CONVERSATIONS_ENDPOINT } from "@/lib/http/endpoints";
import { ChatComposer } from "./ChatComposer";

const START_FAILED = "Não foi possível iniciar a conversa. Tente novamente.";

const SUGGESTIONS = [
  "Como gero um acordo de confidencialidade passo a passo?",
  "O que a biblioteca diz sobre multa por atraso de pagamento?",
  "Qual persona usar num contrato com uma startup?",
  "Quero um contrato de locação comercial: do que você precisa?",
];

/** The assistant's start page: what it can do, example questions and the first message. */
export function NewConversation({ librarySourceCount }: { librarySourceCount: number }) {
  const router = useRouter();
  const { refresh: refreshActivity } = useActivity();
  const [text, setText] = useState("");
  const [useLibrary, setUseLibrary] = useState(librarySourceCount > 0);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(message: string) {
    setIsSending(true);
    setError(null);
    try {
      const body: NewConversationInput = { message, useLibrary };
      const response = await postJson(CONVERSATIONS_ENDPOINT, body);
      if (!response.ok) {
        setError(await readErrorMessage(response, START_FAILED));
        return false;
      }
      const { conversationId } = (await response.json()) as ConversationCreatedResponseBody;
      refreshActivity();
      router.push(conversationPath(conversationId));
      return true;
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      return false;
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
          <Scale className="size-5" />
        </span>
        <h2 className="text-xl font-semibold tracking-tight">Como posso ajudar?</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li>Planejar uma minuta com você e abrir o passo a passo já preenchido.</li>
          <li>Explicar como usar o Magistral: personas, cláusulas, biblioteca, lotes.</li>
          <li>Ler as leis da sua biblioteca e responder citando as fontes.</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="rounded-full border bg-card px-3 py-1.5 text-left text-sm hover:bg-muted"
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
        onSend={start}
        footer={
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={useLibrary}
              disabled={librarySourceCount === 0}
              onChange={(event) => setUseLibrary(event.target.checked)}
            />
            {librarySourceCount === 0 ? "Biblioteca vazia" : "Consultar a biblioteca jurídica"}
          </label>
        }
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        As respostas levam de alguns segundos a alguns minutos. Pode navegar à vontade: você é avisado quando
        chegarem. O Advogado IA não substitui a análise do advogado responsável.
      </p>
    </div>
  );
}
