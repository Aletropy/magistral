"use client";

import { useRouter } from "next/navigation";
import { HOME_PATH } from "@/lib/minutas/paths";
import { SystemPinDialog } from "@/components/shell/SystemPinDialog";

/** The Desenvolvimento hub while its PIN is locked: the dialog opens at once. */
export function DesenvolvimentoLocked() {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">Esta área pede o PIN de 6 dígitos do desenvolvimento.</p>
      <SystemPinDialog open scope="desenvolvimento" onClose={() => router.push(HOME_PATH)} />
    </div>
  );
}
