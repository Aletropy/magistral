"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { useLibraryActions } from "@/hooks/useLibraryActions";

interface DeleteLibrarySourceButtonProps {
  id: number;
  title: string;
  fromFolder: boolean;
}

export function DeleteLibrarySourceButton({ id, title, fromFolder }: DeleteLibrarySourceButtonProps) {
  const router = useRouter();
  const { isPending, error, remove } = useLibraryActions();

  async function handleConfirm() {
    if (await remove(id)) router.refresh();
  }

  return (
    <ConfirmDeleteButton
      title={`Remover “${title}” da biblioteca?`}
      description={
        fromFolder
          ? "O índice deste documento será apagado. O arquivo continua na pasta e volta na próxima sincronização; apague-o da pasta para removê-lo de vez."
          : "O documento e seus trechos indexados serão apagados."
      }
      isPending={isPending}
      error={error}
      onConfirm={handleConfirm}
    />
  );
}
