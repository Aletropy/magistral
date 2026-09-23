import { connection } from "next/server";
import { MinutaStudio } from "@/components/MinutaStudio";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { toPersonaSummary } from "@/lib/personas/toPersonaSummary";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";

export default async function Home() {
  await connection();
  const personas = getPersonaRepository().list().map(toPersonaSummary);
  const librarySourceCount = getLibraryRepository().listSources().length;
  const clauses = getClauseRepository()
    .list()
    .map(({ id, title, category, documentTypes, body }) => ({ id, title, category, documentTypes, body }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Minuta com Personalidade</h1>
        <p className="max-w-2xl text-muted-foreground">
          Informe o tipo de documento, as partes e as cláusulas desejadas, escolha o tom de voz e
          receba uma minuta pronta para revisar e baixar em Word ou PDF.
        </p>
      </header>
      <MinutaStudio personas={personas} clauses={clauses} librarySourceCount={librarySourceCount} />
    </main>
  );
}
