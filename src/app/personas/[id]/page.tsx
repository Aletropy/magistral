import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PersonaEditor } from "@/components/PersonaEditor";
import { Button } from "@/components/ui/button";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { personaPlaygroundPath } from "@/lib/personas/paths";
import { toPersonaInput } from "@/lib/personas/toPersonaInput";
import { requireUser } from "@/lib/auth/dal";

export async function generateMetadata({ params }: PageProps<"/personas/[id]">): Promise<Metadata> {
  await requireUser();
  const { id } = await params;
  const item = getPersonaRepository().get(id);
  return { title: item ? `Editar ${item.name}` : "Persona" };
}

export default async function EditPersonaPage({ params }: PageProps<"/personas/[id]">) {
  await connection();
  await requireUser();
  const { id } = await params;
  const persona = getPersonaRepository().get(id);
  if (!persona) notFound();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Editar “{persona.name}”</h1>
        <Button asChild variant="outline" size="lg">
          <Link href={personaPlaygroundPath(id)}>Testar persona</Link>
        </Button>
      </header>
      <PersonaEditor personaId={id} initialValues={toPersonaInput(persona)} />
    </main>
  );
}
