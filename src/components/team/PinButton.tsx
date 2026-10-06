"use client";

import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOADING_LABEL, useIsHydrated } from "@/hooks/useIsHydrated";
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { MAX_PIN_DIGITS, MIN_PIN_DIGITS, pinSchema } from "@/lib/auth/schema";
import { userEndpoint } from "@/lib/http/endpoints";

const UPDATE_FAILED = "Não foi possível atualizar o PIN. Tente novamente.";
const PIN_MISMATCH_MESSAGE = "Os PINs não conferem.";
const REMOVE_LABEL = "Remover PIN";

/** Sets, changes or removes one account's walk-away PIN; whoever has it unlocks the restricted areas. */
export function PinButton({ userId, name, hasPin }: { userId: string; name: string; hasPin: boolean }) {
  const router = useRouter();
  const { isPending, error, setError, submit } = useJsonSubmit();
  const isHydrated = useIsHydrated();
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();

  function open(next: boolean) {
    setIsOpen(next);
    setPin("");
    setConfirmation("");
    setFieldError(undefined);
    setError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = !pinSchema.safeParse(pin).success
      ? `O PIN tem de ${MIN_PIN_DIGITS} a ${MAX_PIN_DIGITS} dígitos.`
      : pin === confirmation
        ? undefined
        : PIN_MISMATCH_MESSAGE;
    setFieldError(message);
    if (message) return;
    if (await submit("PATCH", userEndpoint(userId), { pin }, UPDATE_FAILED)) {
      open(false);
      router.refresh();
    }
  }

  async function remove() {
    if (await submit("PATCH", userEndpoint(userId), { pin: null }, UPDATE_FAILED)) {
      open(false);
      router.refresh();
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={open}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          {hasPin ? "Alterar PIN" : "Definir PIN"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form className="flex flex-col gap-4" noValidate onSubmit={save}>
          <AlertDialogHeader>
            <AlertDialogTitle>{hasPin ? `Alterar o PIN de ${name}` : `Definir o PIN de ${name}`}</AlertDialogTitle>
            <AlertDialogDescription>
              O PIN trava as áreas restritas em todo navegador até ser digitado. Use de {MIN_PIN_DIGITS} a{" "}
              {MAX_PIN_DIGITS} dígitos numéricos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`pin-${userId}`}>PIN</Label>
            <Input
              id={`pin-${userId}`}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={MAX_PIN_DIGITS}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, MAX_PIN_DIGITS))}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`pin-confirm-${userId}`}>Confirmar PIN</Label>
            <Input
              id={`pin-confirm-${userId}`}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={MAX_PIN_DIGITS}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, MAX_PIN_DIGITS))}
              disabled={isPending}
            />
            {fieldError && (
              <p role="alert" className="text-sm text-destructive">
                {fieldError}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter className="gap-2 sm:justify-between">
            {hasPin && (
              <Button type="button" variant="ghost" onClick={() => void remove()} disabled={isPending}>
                {REMOVE_LABEL}
              </Button>
            )}
            <div className="flex gap-2">
              <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
              <Button type="submit" disabled={isPending || !isHydrated}>
                {!isHydrated ? LOADING_LABEL : isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
