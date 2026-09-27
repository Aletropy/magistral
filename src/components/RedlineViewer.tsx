"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { applyHunkDecisions, diffWords, type HunkDecision } from "@/lib/diff/wordDiff";
import { plural } from "@/lib/text/plural";
import { cn } from "@/lib/utils";

interface RedlineViewerProps {
  original: string;
  revised: string;
  /** When given, each change can be accepted or rejected and the result applied; otherwise the view is read-only. */
  onApply?: (markdown: string) => void;
}

const DECISION_LABELS: Record<HunkDecision, string> = { accept: "Aceita", reject: "Rejeitada" };

/** Inline word-level redline: deletions struck through in red, insertions underlined in green. */
export function RedlineViewer({ original, revised, onApply }: RedlineViewerProps) {
  const parts = useMemo(() => diffWords(original, revised), [original, revised]);
  const changeIds = useMemo(() => parts.flatMap((part) => (part.type === "change" ? [part.id] : [])), [parts]);
  const [decisions, setDecisions] = useState<ReadonlyMap<number, HunkDecision>>(new Map());
  const rejectedCount = changeIds.filter((id) => decisions.get(id) === "reject").length;

  function decide(id: number, decision: HunkDecision) {
    setDecisions((previous) => new Map(previous).set(id, decision));
  }

  function decideAll(decision: HunkDecision) {
    setDecisions(new Map(changeIds.map((id) => [id, decision])));
  }

  if (changeIds.length === 0) {
    return <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Os dois textos são idênticos.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{plural(changeIds.length, "alteração", "alterações")}</span>
        <span className="text-muted-foreground">
          <del className="bg-red-100 text-red-800">removido</del> ·{" "}
          <ins className="bg-green-100 text-green-800 no-underline">incluído</ins>
        </span>
        {onApply && (
          <span className="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => decideAll("accept")}>
              Aceitar todas
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => decideAll("reject")}>
              Rejeitar todas
            </Button>
            <Button type="button" size="sm" onClick={() => onApply(applyHunkDecisions(parts, decisions))}>
              Aplicar à minuta ({plural(changeIds.length - rejectedCount, "aceita", "aceitas")})
            </Button>
          </span>
        )}
      </div>

      <article className="whitespace-pre-wrap rounded-lg border bg-white px-6 py-6 font-serif text-[15px] leading-relaxed text-zinc-900 shadow-sm">
        {parts.map((part, index) => {
          if (part.type === "equal") return <span key={index}>{part.text}</span>;
          const decision = decisions.get(part.id) ?? "accept";
          return (
            <span key={index} className="group relative">
              {part.deleted && (
                <del
                  className={cn(
                    "bg-red-100 text-red-800",
                    onApply && decision === "reject" && "bg-transparent text-inherit no-underline",
                  )}
                >
                  {part.deleted}
                </del>
              )}
              {part.inserted && (
                <ins
                  className={cn(
                    "bg-green-100 text-green-800 no-underline",
                    onApply && decision === "reject" && "bg-zinc-100 text-zinc-400 line-through",
                  )}
                >
                  {part.inserted}
                </ins>
              )}
              {onApply && (
                <span className="ml-1 inline-flex gap-0.5 align-middle font-sans">
                  {(["accept", "reject"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={decision === option}
                      aria-label={`${DECISION_LABELS[option]}: alteração ${part.id + 1}`}
                      className="rounded border px-1 text-[10px] leading-4 text-muted-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                      onClick={() => decide(part.id, option)}
                    >
                      {option === "accept" ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
                    </button>
                  ))}
                </span>
              )}
            </span>
          );
        })}
      </article>
    </div>
  );
}
