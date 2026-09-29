"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { feedbackEndpoint } from "@/lib/http/endpoints";

const UPDATE_FAILED = "Não foi possível atualizar. Tente novamente.";

export function ResolveFeedbackButton({ id, resolved }: { id: number; resolved: boolean }) {
  const router = useRouter();
  const { isPending, error, submit } = useJsonSubmit();

  async function toggle() {
    if (await submit("PATCH", feedbackEndpoint(id), { resolved: !resolved }, UPDATE_FAILED)) router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => void toggle()}>
        {resolved ? "Reabrir" : "Marcar como resolvido"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
