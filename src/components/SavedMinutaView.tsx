"use client";

import { CircleCheck } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ConsultedSources } from "@/components/ConsultedSources";
import { DownloadButtons } from "@/components/DownloadButtons";
import { ForbiddenTermsWarning } from "@/components/ForbiddenTermsWarning";
import { MinutaPreview } from "@/components/MinutaPreview";
import { RedlinePanel } from "@/components/RedlinePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarningCallout } from "@/components/ui/WarningCallout";
import { useReviewPersistence } from "@/hooks/useReviewPersistence";
import type { MinutaResponseBody } from "@/lib/http/contracts";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4" aria-label={title}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * A saved minuta's review page: the document (or the redline of what the AI changed) beside a panel with
 * the downloads, what to double-check and the library sources it cites. Reviewed text is saved at once.
 */
export function SavedMinutaView({ initial }: { initial: MinutaResponseBody }) {
  const [minuta, setMinuta] = useState(initial);
  const { persist, saveError } = useReviewPersistence();
  const blocks = useMemo(() => parseMarkdown(minuta.markdown), [minuta.markdown]);
  const hasWarnings = minuta.forbiddenTermsFound.length > 0 || !minuta.approvedClauseOrderKept;

  function handleReviewApplied(markdown: string) {
    setMinuta((previous) => ({ ...previous, markdown }));
    void persist(minuta.id, markdown);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Tabs defaultValue="document" className="min-w-0">
        <TabsList>
          <TabsTrigger value="document">Documento</TabsTrigger>
          <TabsTrigger value="redline">Revisar alterações</TabsTrigger>
        </TabsList>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        <TabsContent value="document">
          <MinutaPreview blocks={blocks} />
        </TabsContent>
        <TabsContent value="redline">
          <RedlinePanel markdown={minuta.markdown} approvedClauses={minuta.approvedClauses} onApply={handleReviewApplied} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-4 lg:sticky lg:top-20">
        <Panel title="Baixar">
          <DownloadButtons markdown={minuta.markdown} blocks={blocks} stacked />
          <p className="text-xs text-muted-foreground">Os arquivos saem com as revisões aplicadas.</p>
        </Panel>
        <Panel title="Pontos de atenção">
          {hasWarnings ? (
            <div className="flex flex-col gap-2">
              <ForbiddenTermsWarning terms={minuta.forbiddenTermsFound} />
              {!minuta.approvedClauseOrderKept && (
                <WarningCallout>
                  A IA não manteve a ordem escolhida para as cláusulas aprovadas. Revise a sequência antes de exportar.
                </WarningCallout>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleCheck className="size-4 text-primary" aria-hidden />
              Nenhum termo proibido, e as cláusulas aprovadas estão na ordem escolhida.
            </p>
          )}
        </Panel>
        <Panel title="Fontes consultadas">
          <ConsultedSources sources={minuta.consultedSources} strategy={minuta.retrievalStrategy} />
        </Panel>
      </div>
    </div>
  );
}
