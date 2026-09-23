"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteButtonProps {
  title: string;
  description: string;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
}

export function ConfirmDeleteButton({ title, description, isPending, error, onConfirm }: ConfirmDeleteButtonProps) {
  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isPending}>
            {isPending ? "Excluindo…" : "Excluir"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
