"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { useClauseMutations } from "@/hooks/useClauseMutations";

export function DeleteClauseButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { isPending, error, remove } = useClauseMutations();

  async function handleConfirm() {
    if (await remove(id)) router.refresh();
  }

  return (
    <ConfirmDeleteButton
      title={`Excluir “${title}”?`}
      description="A cláusula deixa de ser oferecida no formulário. Minutas já geradas não mudam."
      isPending={isPending}
      error={error}
      onConfirm={handleConfirm}
    />
  );
}
