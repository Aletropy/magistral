"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/** Any unexpected failure while rendering a page; the details stay in the server log (matched by the code). */
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Não foi possível carregar esta página. Tente de novo; se o problema continuar, reinicie o servidor e
        verifique o terminal.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Código do erro: <code className="rounded bg-muted px-1">{error.digest}</code>
        </p>
      )}
      <Button size="lg" onClick={() => retry()}>
        Tentar de novo
      </Button>
    </main>
  );
}
