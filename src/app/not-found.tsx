import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HOME_PATH } from "@/lib/minutas/paths";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-8">
      <p className="text-sm font-medium text-primary">Erro 404</p>
      <h1 className="text-3xl font-bold tracking-tight">Página não encontrada</h1>
      <p className="text-muted-foreground">
        O endereço pode estar errado, ou o item (persona, cláusula, lote ou minuta) foi excluído.
      </p>
      <Button asChild size="lg">
        <Link href={HOME_PATH}>Voltar para Gerar minuta</Link>
      </Button>
    </main>
  );
}
