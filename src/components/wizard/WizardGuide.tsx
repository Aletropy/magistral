import { Lightbulb } from "lucide-react";
import type { WizardStep } from "@/lib/minuta/wizardSteps";

/** The guide beside each step: what it is for and how to fill it well. */
export function WizardGuide({ step }: { step: WizardStep }) {
  return (
    <aside className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4" aria-label="Guia desta etapa">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Lightbulb className="size-4 text-primary" aria-hidden />
        Guia: {step.title}
      </p>
      <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
        {step.guide.map((tip) => (
          <li key={tip} className="leading-snug">
            {tip}
          </li>
        ))}
      </ul>
    </aside>
  );
}
