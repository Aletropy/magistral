"use client";

import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { WizardStep, WizardStepId } from "@/lib/minuta/wizardSteps";
import { cn } from "@/lib/utils";

const PERCENT = 100;

interface WizardStepperProps {
  steps: readonly WizardStep[];
  current: number;
  /** The furthest step reached; steps up to it can be revisited. */
  furthest: number;
  onSelect: (id: WizardStepId) => void;
}

/** Numbered steps on larger screens; "Etapa 3 de 7" with a bar on phones. */
export function WizardStepper({ steps, current, furthest, onSelect }: WizardStepperProps) {
  return (
    <nav aria-label="Etapas da minuta">
      <div className="flex flex-col gap-2 md:hidden">
        <p className="text-sm">
          <span className="text-muted-foreground">
            Etapa {current + 1} de {steps.length} ·{" "}
          </span>
          <span className="font-medium">{steps[current].title}</span>
        </p>
        <Progress value={((current + 1) / steps.length) * PERCENT} aria-label="Progresso do passo a passo" />
      </div>

      <ol className="hidden flex-wrap gap-1 md:flex">
        {steps.map((step, index) => {
          const done = index < current;
          const reachable = index <= furthest;
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={index === current ? "step" : undefined}
                onClick={() => onSelect(step.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-2.5 py-1 text-sm transition",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  index === current ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border text-xs tabular-nums",
                    index === current && "border-primary bg-primary text-primary-foreground",
                    done && "border-primary text-primary",
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-3" /> : index + 1}
                </span>
                {step.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
