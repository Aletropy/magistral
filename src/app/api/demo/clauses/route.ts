import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { loadDemoClauses } from "@/lib/demo/loadDemo";
import type { DemoLoadedResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";

/** Adds the example clauses (idempotent). */
export const POST = defineRoute({}, () =>
  Response.json({ added: loadDemoClauses(getClauseRepository()) } satisfies DemoLoadedResponseBody),
);
