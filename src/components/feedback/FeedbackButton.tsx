"use client";

import { MessageSquareWarning } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LOADING_LABEL, useIsHydrated } from "@/hooks/useIsHydrated";
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { MAX_FEEDBACK_CHARS, feedbackInputSchema } from "@/lib/feedback/schema";
import { FEEDBACK_ENDPOINT } from "@/lib/http/endpoints";

const SEND_FAILED = "Não foi possível enviar. Tente novamente.";
const MESSAGE_ROWS = 6;

/** Lets testers report a problem or suggest something from any page; the page goes along with it. */
export function FeedbackButton() {
  const pathname = usePathname();
  const isHydrated = useIsHydrated();
  const { isPending, error, setError, submit } = useJsonSubmit();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  function open(next: boolean) {
    setIsOpen(next);
    setFieldError(undefined);
    setError(null);
    if (next) setSent(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = feedbackInputSchema.safeParse({ message, page: pathname });
    if (!result.success) {
      setFieldError(result.error.issues[0].message);
      return;
    }
    if (await submit("POST", FEEDBACK_ENDPOINT, result.data, SEND_FAILED)) {
      setMessage("");
      setSent(true);
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={open}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Enviar feedback" title="Enviar feedback">
          <MessageSquareWarning aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {sent ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Obrigado!</AlertDialogTitle>
              <AlertDialogDescription>Seu relato chegou à equipe do Magistral.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <form method="post" className="flex flex-col gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <AlertDialogHeader>
              <AlertDialogTitle>Enviar feedback</AlertDialogTitle>
              <AlertDialogDescription>
                Conte o que deu errado ou o que poderia ser melhor. A página em que você está vai junto.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="sr-only" htmlFor="feedback-message">
              Mensagem
            </label>
            <Textarea
              id="feedback-message"
              rows={MESSAGE_ROWS}
              maxLength={MAX_FEEDBACK_CHARS}
              value={message}
              disabled={isPending}
              aria-invalid={Boolean(fieldError)}
              onChange={(event) => setMessage(event.target.value)}
            />
            {(fieldError ?? error) && (
              <p role="alert" className="text-sm text-destructive">
                {fieldError ?? error}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
              <Button type="submit" disabled={isPending || !isHydrated}>
                {!isHydrated ? LOADING_LABEL : isPending ? "Enviando…" : "Enviar"}
              </Button>
            </AlertDialogFooter>
          </form>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
