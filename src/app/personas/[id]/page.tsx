import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PersonaEditor } from "@/components/PersonaEditor";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";

export default async function EditPersonaPage({ params }: PageProps<"/personas/[id]">) {
  await connection();
  const { id } = await params;
  const persona = getPersonaRepository().get(id);
  if (!persona) notFound();

  const { name, description, systemInstruction, toneParameters, temperature, examples } = persona;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Editar “{name}”</h1>
      <PersonaEditor
        personaId={id}
        initialValues={{ name, description, systemInstruction, toneParameters, temperature, examples }}
      />
    </main>
  );
}
