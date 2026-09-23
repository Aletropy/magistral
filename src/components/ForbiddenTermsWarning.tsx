import { Badge } from "@/components/ui/badge";

/** Lists persona-forbidden terms the model used anyway, so the user can fix them before exporting. */
export function ForbiddenTermsWarning({ terms }: { terms: string[] }) {
  if (terms.length === 0) return null;

  return (
    <div role="status" className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="font-medium">⚠ Termos proibidos encontrados no texto:</span>
      {terms.map((term) => (
        <Badge key={term} variant="outline" className="border-amber-400 bg-white">
          {term}
        </Badge>
      ))}
    </div>
  );
}
