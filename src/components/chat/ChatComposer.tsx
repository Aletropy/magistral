"use client";

import { SendHorizontal } from "lucide-react";
import { useId, useState, type FormEvent, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CHAT_MESSAGE_CHARS } from "@/lib/chat/schema";

const COMPOSER_ROWS = 3;

interface ChatComposerProps {
  /** A reply is being written: the next question waits. */
  disabled: boolean;
  isSending: boolean;
  placeholder?: string;
  /** Resolves to whether the message was sent; the text is kept when it wasn't. */
  onSend: (message: string) => Promise<boolean>;
  /** Controls under the box, e.g. the library toggle. */
  footer?: ReactNode;
  /** Text to start from, e.g. a suggested question. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Lets the panel focus the box when it opens. */
  textareaRef?: Ref<HTMLTextAreaElement>;
}

/** The message box: Enter sends, Shift+Enter breaks the line. */
export function ChatComposer({
  disabled,
  isSending,
  placeholder = "Pergunte ao Advogado IA…",
  onSend,
  footer,
  value,
  onValueChange,
  textareaRef,
}: ChatComposerProps) {
  const textareaId = useId();
  const [ownText, setOwnText] = useState("");
  const text = value ?? ownText;
  const setText = onValueChange ?? setOwnText;
  const canSend = !disabled && !isSending && text.trim().length > 0;

  async function submit() {
    if (!canSend) return;
    if (await onSend(text.trim())) setText("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form className="flex flex-col gap-2 rounded-lg border bg-card p-3" onSubmit={handleSubmit}>
      <label htmlFor={textareaId} className="sr-only">
        Mensagem
      </label>
      <Textarea
        id={textareaId}
        ref={textareaRef}
        rows={COMPOSER_ROWS}
        maxLength={MAX_CHAT_MESSAGE_CHARS}
        placeholder={disabled ? "Aguarde a resposta para enviar outra mensagem…" : placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        className="resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">{footer}</div>
        <Button type="submit" size="sm" disabled={!canSend}>
          <SendHorizontal aria-hidden /> {isSending ? "Enviando…" : "Enviar"}
        </Button>
      </div>
    </form>
  );
}
