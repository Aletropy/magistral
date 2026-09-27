import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PersonaPlayground } from "@/components/PersonaPlayground";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { toPersonaInput } from "@/lib/personas/toPersonaInput";
import { requireUser } from "@/lib/auth/dal";

export async function generateMetadata({ params }: PageProps<"/personas/[id]/playground">): Promise<Metadata> {
  await requireUser();
  const { id } = await params;
  const item = getPersonaRepository().get(id);
  return { title: item ? `Testar ${item.name}` : "Persona" };
}

export default async function PersonaPlaygroundPage({ params }: PageProps<"/personas/[id]/playground">) {
  await connection();
  await requireUser();
  const { id } = await params;
  const persona = getPersonaRepository().get(id);
  if (!persona) notFound();

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Testar “{persona.name}”</h1>
        <p className="max-w-3xl text-muted-foreground">
          Ajuste formalidade, agressividade, extensão e termos proibidos, e compare o texto de amostra
          com a versão reescrita. Nada é salvo até você clicar em “Salvar na persona”.
        </p>
      </header>
      <PersonaPlayground personaId={id} persona={toPersonaInput(persona)} />
    </main>
  );
}
