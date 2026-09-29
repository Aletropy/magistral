"use client";

import { Check, Copy, Loader2, Scale } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { StepDecision } from "@/lib/assistant/stepDecisions";
import type { ChatMessage } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { ChatMarkdown } from "./ChatMarkdown";
import { ToolSteps } from "./ToolSteps";

const COPIED_FEEDBACK_MS = 2000;

interface ChatMessageViewProps {
  message: ChatMessage;
  onRetry: (messageId: number) => void;
  onCancel: (taskId: string) => void;
  /** False while a reply is being written, so an action waits for it. */
  canDecide: boolean;
  onDecide: (stepId: number, decision: StepDecision) => Promise<boolean>;
}

function Sources({ message }: { message: ChatMessage }) {
  if (message.sources.length === 0) return null;
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground">Fontes da biblioteca ({message.sources.length})</summary>
      <ol className="mt-1 flex flex-col gap-0.5 pl-1">
        {message.sources.map((source) => (
          <li key={source.ref}>
            <span className="font-medium">[{source.ref}]</span> {source.title}
            <span className="text-muted-foreground"> — {source.label}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard blocked: nothing to do.
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void copy()}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

/** One message: the user's question on the right, the Advogado IA's answer (or its progress) on the left. */
export function ChatMessageView({ message, onRetry, onCancel, canDecide, onDecide }: ChatMessageViewProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/10 px-4 py-2 text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
        <Scale className="size-4" />
      </span>
      <div className={cn("min-w-0 flex-1 rounded-2xl rounded-tl-sm border bg-card px-4 py-3")}>
        {message.status === "pending" && (
          <div className="flex flex-col gap-2" role="status">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
              O Advogado IA está pensando…
            </p>
            <p className="text-xs text-muted-foreground">
              Pode sair desta página: avisaremos quando a resposta chegar.
            </p>
            {message.taskId && (
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onCancel(message.taskId!)}>
                Cancelar
              </Button>
            )}
          </div>
        )}
        {message.status === "failed" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-destructive">{message.error ?? "Não foi possível responder."}</p>
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onRetry(message.id)}>
              Tentar novamente
            </Button>
          </div>
        )}
        {message.status === "done" && (
          <>
            <ChatMarkdown markdown={message.content} />
            <ToolSteps steps={message.steps} canDecide={canDecide} onDecide={onDecide} />
            <Sources message={message} />
            <div className="mt-1 flex justify-end">
              <CopyButton text={message.content} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
