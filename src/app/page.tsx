import Link from "next/link";
import { connection } from "next/server";
import { MinutaStudio } from "@/components/MinutaStudio";
import { requireUser } from "@/lib/auth/dal";
import { ASSISTANT_PATH } from "@/lib/chat/paths";
import { loadGenerationState } from "@/lib/minuta/loadGenerationState";
import { loadMinutaFormOptions } from "@/lib/minuta/loadMinutaFormOptions";
import { DRAFT_SUGGESTION_QUERY_PARAM } from "@/lib/minuta/paths";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { readTaskParam } from "@/lib/tasks/readTaskParam";

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection();
  const user = await requireUser();
  const params = await searchParams;
  const options = loadMinutaFormOptions();
  const initialGeneration = loadGenerationState(readTaskParam(params), user.id);
  const suggestionId = readTaskParam(params, DRAFT_SUGGESTION_QUERY_PARAM);
  const suggestion = suggestionId ? getTaskRepository().get(suggestionId, user.id) : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Minuta com Personalidade</h1>
        <p className="max-w-2xl text-muted-foreground">
          Siga o passo a passo ou preencha o formulário completo, parta do zero ou de um documento base, escolha o
          tom de voz e receba uma minuta pronta para revisar e baixar em Word ou PDF.
        </p>
        <p className="text-sm text-muted-foreground">
          Dúvidas sobre o que pedir?{" "}
          <Link href={ASSISTANT_PATH} className="text-primary hover:underline">
            Converse com o Advogado IA
          </Link>{" "}
          e ele monta a minuta com você.
        </p>
      </header>
      <MinutaStudio
        userId={user.id}
        {...options}
        initialGeneration={initialGeneration}
        initialSuggestion={suggestion?.kind === "minuta.extract" ? suggestion : null}
      />
    </main>
  );
}
