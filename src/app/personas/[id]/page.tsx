import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AssistantContext } from "@/components/assistant/AssistantContext";
import { Page } from "@/components/layout/Page";
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
    <Page
      title={<>Editar “{persona.name}”</>}
      width="default"
      actions={
        <>
          <Button asChild variant="outline" size="lg">
            <Link href={personaPlaygroundPath(id)}>Testar persona</Link>
          </Button>
        </>
      }
    >
      <AssistantContext kind="persona" id={id} />
      <PersonaEditor personaId={id} initialValues={toPersonaInput(persona)} />
    </Page>
  );
}
