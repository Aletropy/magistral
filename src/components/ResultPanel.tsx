"use client";

import { useMemo } from "react";
import { DownloadButtons } from "@/components/DownloadButtons";
import { ForbiddenTermsWarning } from "@/components/ForbiddenTermsWarning";
import { MinutaPreview } from "@/components/MinutaPreview";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";

interface ResultPanelProps {
  markdown: string | null;
  forbiddenTermsFound: string[];
  isGenerating: boolean;
  error: string | null;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

export function ResultPanel({ markdown, forbiddenTermsFound, isGenerating, error }: ResultPanelProps) {
  const blocks = useMemo(() => (markdown ? parseMarkdown(markdown) : []), [markdown]);

  return (
    <section className="flex flex-col gap-4" aria-live="polite" aria-busy={isGenerating}>
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {isGenerating ? (
        <Notice>
          <span className="animate-pulse">
            Redigindo a minuta com a personalidade escolhida… isso pode levar até alguns minutos.
          </span>
        </Notice>
      ) : markdown ? (
        <>
          <DownloadButtons markdown={markdown} blocks={blocks} />
          <ForbiddenTermsWarning terms={forbiddenTermsFound} />
          <MinutaPreview blocks={blocks} />
        </>
      ) : (
        <Notice>Preencha o formulário e clique em “Gerar minuta” para ver o documento aqui.</Notice>
      )}
    </section>
  );
}
