"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NETWORK_ERROR_MESSAGE, readErrorMessage } from "@/lib/http/client";
import { SYSTEM_UNLOCK_ENDPOINT } from "@/lib/http/endpoints";
import type { PinScope } from "@/lib/pinCookies";

const SUBMIT_FAILED_MESSAGE = "Não foi possível desbloquear. Tente novamente.";

const COPY: Record<PinScope, { title: string; description: string; digits: number; dialogLabel: string }> = {
  sistema: {
    title: "Área restrita",
    description: "Informe o PIN de 4 dígitos do escritório.",
    digits: 4,
    dialogLabel: "Desbloquear Sistema",
  },
  desenvolvimento: {
    title: "Desenvolvimento",
    description: "Informe o PIN de 6 dígitos do desenvolvimento.",
    digits: 6,
    dialogLabel: "Desbloquear Desenvolvimento",
  },
};

interface SystemPinDialogProps {
  open: boolean;
  onClose: () => void;
  scope?: PinScope;
}

/** Asks the office digits that reveal a locked section. */
export function SystemPinDialog({ open, onClose, scope = "sistema" }: SystemPinDialogProps) {
  const router = useRouter();
  const { title, description, digits, dialogLabel } = COPY[scope];
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
    if (!new RegExp(`^\\d{${digits}}$`).test(pin)) {
      setError(`Informe os ${digits} dígitos do PIN.`);
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch(SYSTEM_UNLOCK_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, pin }),
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
      aria-label={dialogLabel}
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
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`pin-${scope}`}>PIN</Label>
          <Input
            id={`pin-${scope}`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={digits}
            autoFocus
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, digits))}
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
          <Button type="submit" disabled={isPending || pin.length !== digits}>
            {isPending ? "Desbloqueando…" : "Desbloquear"}
          </Button>
        </div>
      </form>
    </div>
  );
}
