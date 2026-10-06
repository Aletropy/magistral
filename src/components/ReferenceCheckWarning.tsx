import { WarningCallout } from "@/components/ui/WarningCallout";
import type { UnconfirmedReference } from "@/lib/minuta/types";

/** Lists norm references the post-draft audit could not confirm in the consulted sources. */
export function ReferenceCheckWarning({ unconfirmed }: { unconfirmed: UnconfirmedReference[] }) {
  if (unconfirmed.length === 0) return null;

  return (
    <WarningCallout>
      <span className="font-medium">
        Verificação de referências: {unconfirmed.length === 1 ? "esta citação não" : "estas citações não"} foi
        {unconfirmed.length === 1 ? "" : "ram"} confirmada{unconfirmed.length === 1 ? "" : "s"} nas fontes consultadas.
        Confira antes de exportar.
      </span>
      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5">
        {unconfirmed.map(({ reference, reason }) => (
          <li key={reference}>
            {reference} <span className="text-muted-foreground">— {reason}</span>
          </li>
        ))}
      </ul>
    </WarningCallout>
  );
}
