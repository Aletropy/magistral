import type { Metadata } from "next";
import { connection } from "next/server";
import { Page } from "@/components/layout/Page";
import { StyleCapture } from "@/components/StyleCapture";
import { requireUser } from "@/lib/auth/dal";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { toPersonaInput } from "@/lib/personas/toPersonaInput";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { readTaskParam } from "@/lib/tasks/readTaskParam";

export const metadata: Metadata = { title: "Capturar estilo" };

export default async function StyleCapturePage({ searchParams }: PageProps<"/personas/capturar">) {
  await connection();
  const user = await requireUser();
  const taskId = readTaskParam(await searchParams);
  const task = taskId ? getTaskRepository().get(taskId, user.id) : null;
  const personas = getPersonaRepository()
    .list()
    .map((persona) => ({ id: persona.id, input: toPersonaInput(persona) }));

  return (
    <Page
      title="Capturar estilo de um documento"
      width="wide"
      description={
        <>
          Envie uma minuta ou parecer cujo estilo você quer reproduzir. A IA extrai estrutura, vocabulário, tamanho das
          frases, títulos, citações e tom, e separa trechos literais para servir de exemplo.
        </>
      }
    >
      <StyleCapture personas={personas} initialTask={task?.kind === "style.capture" ? task : null} />
    </Page>
  );
}
