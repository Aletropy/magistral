"use client";

import { useMemo } from "react";
import { DownloadButtons } from "@/components/DownloadButtons";
import { ConsultedSources } from "@/components/ConsultedSources";
import { ForbiddenTermsWarning } from "@/components/ForbiddenTermsWarning";
import { RedlinePanel } from "@/components/RedlinePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MinutaPreview } from "@/components/MinutaPreview";
import type { MinutaResponseBody } from "@/lib/http/api";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";

interface ResultPanelProps {
  result: MinutaResponseBody | null;
  isGenerating: boolean;
  /** Replaces the minuta's Markdown with the version reviewed in the redline. */
  onReviewApplied: (markdown: string) => void;
  error: string | null;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

export function ResultPanel({ result, isGenerating, error, onReviewApplied }: ResultPanelProps) {
  const blocks = useMemo(() => (result ? parseMarkdown(result.markdown) : []), [result]);

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
      ) : result ? (
        <>
          <DownloadButtons markdown={result.markdown} blocks={blocks} />
          <ForbiddenTermsWarning terms={result.forbiddenTermsFound} />
          {!result.approvedClauseOrderKept && (
            <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ⚠ A IA não manteve a ordem escolhida para as cláusulas aprovadas. Revise a sequência antes de
              exportar.
            </p>
          )}
          <ConsultedSources sources={result.consultedSources} strategy={result.retrievalStrategy} />
          <Tabs defaultValue="document">
            <TabsList>
              <TabsTrigger value="document">Documento</TabsTrigger>
              <TabsTrigger value="redline">Comparar (redline)</TabsTrigger>
            </TabsList>
            <TabsContent value="document">
              <MinutaPreview blocks={blocks} />
            </TabsContent>
            <TabsContent value="redline">
              <RedlinePanel
                markdown={result.markdown}
                approvedClauses={result.approvedClauses}
                onApply={onReviewApplied}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Notice>Preencha o formulário e clique em “Gerar minuta” para ver o documento aqui.</Notice>
      )}
    </section>
  );
}
