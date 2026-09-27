import { Badge } from "@/components/ui/badge";
import { WarningCallout } from "@/components/ui/WarningCallout";

/** Lists persona-forbidden terms the model used anyway, so the user can fix them before exporting. */
export function ForbiddenTermsWarning({ terms }: { terms: string[] }) {
  if (terms.length === 0) return null;

  return (
    <WarningCallout className="flex flex-wrap items-center gap-2">
      <span className="font-medium">Termos proibidos encontrados no texto:</span>
      {terms.map((term) => (
        <Badge key={term} variant="outline" className="border-warning-border bg-background text-foreground">
          {term}
        </Badge>
      ))}
    </WarningCallout>
  );
}
