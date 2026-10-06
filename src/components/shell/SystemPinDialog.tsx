"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NETWORK_ERROR_MESSAGE, readErrorMessage } from "@/lib/http/client";
import { SYSTEM_UNLOCK_ENDPOINT } from "@/lib/http/endpoints";

const SUBMIT_FAILED_MESSAGE = "Não foi possível desbloquear. Tente novamente.";

interface SystemPinDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Asks the four office digits that reveal the Sistema section. */
export function SystemPinDialog({ open, onClose }: SystemPinDialogProps) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  if (!open) return null;

  function close() {
    if (isPending) return;
    setPin("");
    setError(null);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") close();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError("Informe os 4 dígitos do PIN.");
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch(SYSTEM_UNLOCK_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, SUBMIT_FAILED_MESSAGE));
        return;
      }
      close();
      router.refresh();
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Desbloquear Sistema"
      onKeyDown={handleKeyDown}
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
    >
      <form
        onSubmit={(event) => void submit(event)}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-xs flex-col gap-3 rounded-lg border bg-card p-5 shadow-xl"
      >
        <div className="flex flex-col gap-1">
          <p className="font-medium">Área restrita</p>
          <p className="text-sm text-muted-foreground">Informe o PIN de 4 dígitos do escritório.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="system-pin">PIN</Label>
          <Input
            id="system-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
            className="text-center text-lg tracking-[0.5em]"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || pin.length !== 4}>
            {isPending ? "Desbloqueando…" : "Desbloquear"}
          </Button>
        </div>
      </form>
    </div>
  );
}
