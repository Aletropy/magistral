"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLibraryActions } from "@/hooks/useLibraryActions";
import type { LibraryReindexResponseBody } from "@/lib/http/api";

export function ReindexLibraryButton() {
  const router = useRouter();
  const { isPending, error, reindex } = useLibraryActions();

  async function handleClick() {
    if (await reindex<LibraryReindexResponseBody>()) router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" disabled={isPending} onClick={handleClick}>
        {isPending ? "Reindexando… (pode levar alguns minutos)" : "Reindexar biblioteca"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
