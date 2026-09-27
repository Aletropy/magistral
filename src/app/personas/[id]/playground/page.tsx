import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Page } from "@/components/layout/Page";
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
    <Page
      title={<>Testar “{persona.name}”</>}
      width="full"
      description={
        <>
          Ajuste formalidade, agressividade, extensão e termos proibidos, e compare o texto de amostra com a versão
          reescrita. Nada é salvo até você clicar em “Salvar na persona”.
        </>
      }
    >
      <PersonaPlayground personaId={id} persona={toPersonaInput(persona)} />
    </Page>
  );
}
