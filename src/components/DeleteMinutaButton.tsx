"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { useResourceMutations } from "@/hooks/useResourceMutations";
import { MINUTAS_ENDPOINT, minutaEndpoint } from "@/lib/http/api";
import { HISTORY_PATH } from "@/lib/minutas/paths";

const ENDPOINTS = { collection: MINUTAS_ENDPOINT, item: minutaEndpoint };
const MESSAGES = { saveFailed: "", deleteFailed: "Não foi possível excluir a minuta. Tente novamente." };

interface DeleteMinutaButtonProps {
  id: string;
  title: string;
  /** Go back to the history list after deleting (used on the minuta's own page). */
  leavePage?: boolean;
}

export function DeleteMinutaButton({ id, title, leavePage = false }: DeleteMinutaButtonProps) {
  const router = useRouter();
  const { isPending, error, remove } = useResourceMutations<never>(ENDPOINTS, MESSAGES);

  async function handleConfirm() {
    if (!(await remove(id))) return;
    if (leavePage) router.push(HISTORY_PATH);
    router.refresh();
  }

  return (
    <ConfirmDeleteButton
      title={`Excluir “${title}”?`}
      description="A minuta sai do histórico. Arquivos já baixados não são afetados."
      isPending={isPending}
      error={error}
      onConfirm={handleConfirm}
    />
  );
}
