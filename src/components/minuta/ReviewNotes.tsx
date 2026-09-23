import { WarningCallout } from "@/components/ui/WarningCallout";

/** What the AI asked the user to double-check after filling the form from a document or conversation. */
export function ReviewNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <WarningCallout className="flex flex-col gap-1">
      <p className="font-medium">Confira antes de gerar:</p>
      <ul className="list-disc pl-5">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </WarningCallout>
  );
}
