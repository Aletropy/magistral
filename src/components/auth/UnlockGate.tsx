"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOADING_LABEL } from "@/hooks/useIsHydrated";
import { MAX_PIN_DIGITS, MIN_PIN_DIGITS, pinSchema } from "@/lib/auth/schema";
import { NETWORK_ERROR_MESSAGE, readErrorMessage, sendJson } from "@/lib/http/client";
import { UNLOCK_ENDPOINT } from "@/lib/http/endpoints";
import { HOME_PATH } from "@/lib/minutas/paths";

const SUBMIT_FAILED_MESSAGE = "Não foi possível desbloquear. Tente novamente.";
const UNLOCK_LABEL = "Desbloquear";
const LEAVE_LABEL = "Sair";

/** A PIN-locked area: opens the unlock dialog at once, and leaving it goes back to the dashboard. */
export function UnlockGate() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function leave() {
    if (isPending) return;
    void router.push(HOME_PATH);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pinSchema.safeParse(pin).success) {
      setError(`O PIN tem de ${MIN_PIN_DIGITS} a ${MAX_PIN_DIGITS} dígitos.`);
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const response = await sendJson("POST", UNLOCK_ENDPOINT, { pin });
      if (!response.ok) {
        setError(await readErrorMessage(response, SUBMIT_FAILED_MESSAGE));
        return;
      }
      setPin("");
      router.refresh();
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Esta área está bloqueada pelo PIN desta conta. Digite o PIN para continuar.
      </p>
      <AlertDialog open onOpenChange={(open) => { if (!open) leave(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Área bloqueada</AlertDialogTitle>
            <AlertDialogDescription>
              Esta área está bloqueada pelo PIN desta conta. Digite o PIN para ver o conteúdo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unlock-pin">PIN</Label>
              <Input
                id="unlock-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={MAX_PIN_DIGITS}
                autoFocus
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, MAX_PIN_DIGITS))}
                className="text-center text-lg tracking-[0.4em]"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={leave} disabled={isPending}>
                {LEAVE_LABEL}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? LOADING_LABEL : UNLOCK_LABEL}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
