import { z } from "zod";

/** What the user can answer to an action the assistant proposed. Client-safe. */
export const STEP_DECISIONS = ["confirm", "reject"] as const;
export type StepDecision = (typeof STEP_DECISIONS)[number];

export const stepDecisionSchema = z.object({ decision: z.enum(STEP_DECISIONS) });
