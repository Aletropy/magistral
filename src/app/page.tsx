import { MinutaStudio } from "@/components/MinutaStudio";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Minuta com Personalidade</h1>
        <p className="max-w-2xl text-zinc-600">
          Informe o tipo de documento, as partes e as cláusulas desejadas, escolha o tom de voz e
          receba uma minuta pronta para revisar e baixar em Word ou PDF.
        </p>
      </header>
      <MinutaStudio />
    </main>
  );
}
