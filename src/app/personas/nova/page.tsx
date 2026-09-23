import { PersonaEditor } from "@/components/PersonaEditor";
import { EMPTY_PERSONA } from "@/lib/personas/schema";

export default function NewPersonaPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Nova persona</h1>
      <PersonaEditor initialValues={EMPTY_PERSONA} />
    </main>
  );
}
