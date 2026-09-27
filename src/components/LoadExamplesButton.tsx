"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NETWORK_ERROR_MESSAGE, readErrorMessage } from "@/lib/http/client";

const LOAD_FAILED = "Não foi possível carregar os exemplos. Tente novamente.";

interface LoadExamplesButtonProps {
  endpoint: string;
  label: string;
  pendingLabel: string;
  /** Shown under the button, e.g. that the first run downloads a model. */
  note?: string;
}

/** Fills an empty page with the built-in examples so every feature can be tried right away. */
export function LoadExamplesButton({ endpoint, label, pendingLabel, note }: LoadExamplesButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      if (!response.ok) {
        setError(await readErrorMessage(response, LOAD_FAILED));
        return;
      }
      router.refresh();
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" disabled={isPending} onClick={handleClick}>
        {isPending ? pendingLabel : label}
      </Button>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
