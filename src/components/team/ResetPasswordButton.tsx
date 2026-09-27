"use client";

import { useState, type FormEvent } from "react";
import { PASSWORDS_DIFFER_MESSAGE, PasswordFields } from "@/components/auth/PasswordFields";
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
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { newPasswordSchema } from "@/lib/auth/schema";
import { userEndpoint } from "@/lib/http/api";

const RESET_FAILED = "Não foi possível redefinir a senha. Tente novamente.";

/** Sets a new password for someone who forgot theirs; their open sessions end. */
export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const { isPending, error, setError, submit } = useJsonSubmit();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();

  function open(next: boolean) {
    setIsOpen(next);
    setPassword("");
    setConfirmation("");
    setFieldError(undefined);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = newPasswordSchema.safeParse(password);
    const message = result.success ? (password === confirmation ? undefined : PASSWORDS_DIFFER_MESSAGE) : result.error.issues[0].message;
    setFieldError(message);
    if (message) return;
    if (await submit("PATCH", userEndpoint(userId), { password }, RESET_FAILED)) open(false);
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={open}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Redefinir senha
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir a senha de {name}</AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa sai de todos os navegadores e entra de novo com a senha nova.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <PasswordFields
            idPrefix={`reset-${userId}`}
            password={password}
            confirmation={confirmation}
            onPasswordChange={setPassword}
            onConfirmationChange={setConfirmation}
            error={fieldError}
            disabled={isPending}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Redefinir"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
