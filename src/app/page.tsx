import { connection } from "next/server";
import { MinutaStudio } from "@/components/MinutaStudio";
import { loadGenerationState } from "@/lib/minuta/loadGenerationState";
import { loadMinutaFormOptions } from "@/lib/minuta/loadMinutaFormOptions";
import { readTaskParam } from "@/lib/tasks/readTaskParam";

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection();
  const options = loadMinutaFormOptions();
  const initialGeneration = loadGenerationState(readTaskParam(await searchParams));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Minuta com Personalidade</h1>
        <p className="max-w-2xl text-muted-foreground">
          Informe o tipo de documento, as partes e as cláusulas desejadas, escolha o tom de voz e
          receba uma minuta pronta para revisar e baixar em Word ou PDF.
        </p>
      </header>
      <MinutaStudio {...options} initialGeneration={initialGeneration} />
    </main>
  );
}
