import type { ConsultedSource } from "@/lib/minuta/types";

interface ConsultedSourcesProps {
  sources: ConsultedSource[];
  strategy: "full" | "search" | null;
}

const STRATEGY_DESCRIPTIONS = {
  full: "A IA recebeu a biblioteca inteira.",
  search: "A IA recebeu os trechos mais relevantes da biblioteca para esta minuta.",
} as const;

/** Lists the library excerpts a minuta was grounded in, so the user can check every citation. */
export function ConsultedSources({ sources, strategy }: ConsultedSourcesProps) {
  if (sources.length === 0 || !strategy) {
    return <p className="text-sm text-muted-foreground">Esta minuta não usou a biblioteca jurídica.</p>;
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-xs text-muted-foreground">{STRATEGY_DESCRIPTIONS[strategy]}</p>
      <ol className="flex list-decimal flex-col gap-1 pl-5">
        {sources.map((source) => (
          <li key={source.ref}>
            <span className="font-medium">{source.title}</span>
            <span className="text-muted-foreground"> — {source.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
