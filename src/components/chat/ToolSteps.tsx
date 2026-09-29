"use client";

import { ArrowRight, CircleAlert, CircleCheck, CircleX, Hourglass, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RedlineViewer } from "@/components/RedlineViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LOADING_LABEL, useIsHydrated } from "@/hooks/useIsHydrated";
import type { StepDecision } from "@/lib/assistant/stepDecisions";
import type { ChatToolStep, ToolCard, ToolStepStatus } from "@/lib/chat/toolSteps";

const ACTION_STATUS: Record<ToolStepStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  awaiting_confirmation: { label: "Aguardando você", variant: "default" },
  confirmed: { label: "Confirmada", variant: "secondary" },
  rejected: { label: "Recusada", variant: "outline" },
  failed: { label: "Não foi possível", variant: "destructive" },
  done: { label: "Concluída", variant: "secondary" },
};

function CardLink({ card }: { card: Extract<ToolCard, { type: "link" }> }) {
  return (
    <Button asChild size="sm" variant="outline" className="self-start">
      <Link href={card.href}>
        {card.label}
        <ArrowRight aria-hidden />
      </Link>
    </Button>
  );
}

function CardBody({ card }: { card: ToolCard }) {
  if (card.type === "link") return <CardLink card={card} />;
  if (card.type === "fields") {
    return (
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {card.rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="font-medium text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 break-words whitespace-pre-wrap">{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <div className="max-h-96 overflow-y-auto rounded-md border bg-background p-3">
      <RedlineViewer original={card.original} revised={card.revised} />
    </div>
  );
}

/** A reading step: one line, with its link when it has one. */
function ReadStep({ step }: { step: ChatToolStep }) {
  const failed = step.status === "failed";
  const Icon = failed ? CircleAlert : Wrench;
  return (
    <li className="flex flex-col gap-1.5">
      <span className={failed ? "flex items-center gap-2 text-destructive" : "flex items-center gap-2 text-muted-foreground"}>
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {step.summary}
        {failed && step.output ? `: ${step.output}` : ""}
      </span>
      {step.card?.type === "link" && <CardLink card={step.card} />}
    </li>
  );
}

interface ActionStepProps {
  step: ChatToolStep;
  /** False while a reply is being written: decisions wait for it. */
  canDecide: boolean;
  onDecide: (stepId: number, decision: StepDecision) => Promise<boolean>;
}

/** An action the assistant proposed: what it will do, and the buttons to confirm or reject it. */
function ActionStep({ step, canDecide, onDecide }: ActionStepProps) {
  const isHydrated = useIsHydrated();
  const [deciding, setDeciding] = useState<StepDecision | null>(null);
  const status = ACTION_STATUS[step.status];
  const StatusIcon = step.status === "confirmed" ? CircleCheck : step.status === "awaiting_confirmation" ? Hourglass : CircleX;
  const isWaiting = step.status === "awaiting_confirmation";

  async function decide(decision: StepDecision) {
    setDeciding(decision);
    try {
      await onDecide(step.id, decision);
    } finally {
      setDeciding(null);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <StatusIcon className="size-4 shrink-0 text-primary" aria-hidden />
          {step.summary}
        </span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      {step.card && <CardBody card={step.card} />}
      {step.output && !isWaiting && (
        <p className={step.status === "failed" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{step.output}</p>
      )}
      {isWaiting && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={!isHydrated || !canDecide || deciding !== null} onClick={() => void decide("confirm")}>
            {!isHydrated ? LOADING_LABEL : deciding === "confirm" ? "Confirmando…" : "Confirmar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!isHydrated || !canDecide || deciding !== null}
            onClick={() => void decide("reject")}
          >
            {deciding === "reject" ? "Recusando…" : "Recusar"}
          </Button>
        </div>
      )}
    </li>
  );
}

interface ToolStepsProps {
  steps: ChatToolStep[];
  canDecide: boolean;
  onDecide: (stepId: number, decision: StepDecision) => Promise<boolean>;
}

/** What the Advogado IA did for a reply: the tools it used, then the action it proposed. */
export function ToolSteps({ steps, canDecide, onDecide }: ToolStepsProps) {
  if (steps.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-col gap-2 border-t pt-3 text-xs" aria-label="O que o Advogado IA fez">
      {steps.map((step) =>
        step.kind === "action" ? (
          <ActionStep key={step.id} step={step} canDecide={canDecide} onDecide={onDecide} />
        ) : (
          <ReadStep key={step.id} step={step} />
        ),
      )}
    </ul>
  );
}
