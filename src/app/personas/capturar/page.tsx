import type { Metadata } from "next";
import { connection } from "next/server";
import { StyleCapture } from "@/components/StyleCapture";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { toPersonaInput } from "@/lib/personas/toPersonaInput";

export const metadata: Metadata = { title: "Capturar estilo" };

export default async function StyleCapturePage() {
  await connection();
  const personas = getPersonaRepository()
    .list()
    .map((persona) => ({ id: persona.id, input: toPersonaInput(persona) }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Capturar estilo de um documento</h1>
        <p className="max-w-3xl text-muted-foreground">
          Envie uma minuta ou parecer cujo estilo você quer reproduzir. A IA extrai estrutura,
          vocabulário, tamanho das frases, títulos, citações e tom, e separa trechos literais para
          servir de exemplo.
        </p>
      </header>
      <StyleCapture personas={personas} />
    </main>
  );
}
