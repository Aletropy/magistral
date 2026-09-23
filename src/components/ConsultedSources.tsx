import type { ConsultedSource } from "@/lib/http/api";

interface ConsultedSourcesProps {
  sources: ConsultedSource[];
  strategy: "full" | "search" | null;
}

const STRATEGY_DESCRIPTIONS = {
  full: "A biblioteca inteira coube no contexto da IA.",
  search: "Trechos escolhidos por busca híbrida (palavras-chave + semântica).",
} as const;

/** Lists the library excerpts a minuta was grounded in, so the user can check every citation. */
export function ConsultedSources({ sources, strategy }: ConsultedSourcesProps) {
  if (sources.length === 0 || !strategy) return null;

  return (
    <details className="rounded-md border bg-card px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">Fontes consultadas ({sources.length})</summary>
      <p className="mt-2 text-xs text-muted-foreground">{STRATEGY_DESCRIPTIONS[strategy]}</p>
      <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5">
        {sources.map((source) => (
          <li key={source.ref}>
            <span className="font-medium">{source.title}</span>
            <span className="text-muted-foreground"> — {source.label}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
