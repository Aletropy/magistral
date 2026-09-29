import { defineRoute } from "@/lib/http/route";
import { HTTP_NO_CONTENT } from "@/lib/http/status";
import { disconnect } from "@/lib/integrations/jurisprudencias/connection";

/** Forgets the office's Jurisprudências.ai connection. */
export const DELETE = defineRoute({ access: "admin" }, () => {
  disconnect();
  return new Response(null, { status: HTTP_NO_CONTENT });
});
