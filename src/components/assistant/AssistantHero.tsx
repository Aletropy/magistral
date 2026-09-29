"use client";

import { Scale } from "lucide-react";
import { useState } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { useStartConversation } from "@/hooks/useStartConversation";
import { useAssistantPanel } from "./AssistantProvider";

/** Ways to start, as the first message they put in the box. */
const STARTERS = [
  { label: "Nova minuta de locação", message: "Quero uma minuta de contrato de locação. Do que você precisa?" },
  { label: "Revisar uma minuta do histórico", message: "Quero revisar uma minuta do meu histórico. Quais são as mais recentes?" },
  { label: "Consultar a biblioteca", message: "O que a biblioteca diz sobre " },
  { label: "Cadastrar uma cláusula aprovada", message: "Quero cadastrar uma cláusula aprovada sobre " },
];

/** The dashboard's opening: ask the Advogado IA anything; the conversation continues in the panel. */
export function AssistantHero() {
  const { open } = useAssistantPanel();
  const [text, setText] = useState("");
  const { start, isSending, error } = useStartConversation((conversationId) => open({ conversationId }));

  return (
    <section aria-labelledby="assistente-titulo" className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
          <Scale className="size-5" />
        </span>
        <div className="flex flex-col">
          <h2 id="assistente-titulo" className="text-lg font-semibold tracking-tight">
            Como posso ajudar?
          </h2>
          <p className="text-sm text-muted-foreground">
            O Advogado IA consulta suas minutas, personas, cláusulas e a biblioteca, e pede sua confirmação antes de
            gerar ou alterar algo.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {STARTERS.map((starter) => (
          <button
            key={starter.label}
            type="button"
            className="rounded-full border bg-background px-3 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => setText(starter.message)}
          >
            {starter.label}
          </button>
        ))}
      </div>
      <ChatComposer
        disabled={false}
        isSending={isSending}
        value={text}
        onValueChange={setText}
        placeholder="Descreva o que precisa: uma minuta, uma revisão, uma dúvida…"
        onSend={(message) => start({ message })}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
