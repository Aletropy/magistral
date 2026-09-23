"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { usePersonaMutations } from "@/hooks/usePersonaMutations";

interface DeletePersonaButtonProps {
  id: string;
  name: string;
}

export function DeletePersonaButton({ id, name }: DeletePersonaButtonProps) {
  const router = useRouter();
  const { isPending, error, remove } = usePersonaMutations();

  async function handleConfirm() {
    if (await remove(id)) router.refresh();
  }

  return (
    <ConfirmDeleteButton
      title={`Excluir “${name}”?`}
      description="A persona e seus exemplos serão apagados. Essa ação não pode ser desfeita."
      isPending={isPending}
      error={error}
      onConfirm={handleConfirm}
    />
  );
}
