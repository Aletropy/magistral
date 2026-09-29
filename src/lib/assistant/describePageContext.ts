import type { BatchRepository } from "@/lib/batch/repository";
import type { ClauseRepository } from "@/lib/clauses/repository";
import type { MinutaRepository } from "@/lib/minutas/repository";
import type { PersonaRepository } from "@/lib/personas/repository";
import { plural } from "@/lib/text/plural";
import type { PageContext } from "./pageContext";

export interface PageContextSources {
  minutas: MinutaRepository;
  personas: PersonaRepository;
  clauses: ClauseRepository;
  batches: BatchRepository;
}

/**
 * One or two sentences on what the user has open, for the assistant to understand "esta minuta" or "este
 * passo". Items are looked up for the user, so another user's minuta or batch reads as nothing; the ids
 * let the model read the item with its tools.
 */
export function describePageContext(context: PageContext, ownerId: string, sources: PageContextSources): string | null {
  const { kind, id, detail } = context;
  const extra = detail ? ` ${detail}` : "";
  switch (kind) {
    case "minuta": {
      const minuta = id ? sources.minutas.get(id, ownerId) : null;
      return minuta
        ? `O usuário está com a minuta “${minuta.title}” aberta (id ${minuta.id}, ${minuta.documentTypeLabel}, persona ${minuta.personaName}). Para ler o texto, use ler_minuta.`
        : null;
    }
    case "persona": {
      const persona = id ? sources.personas.get(id) : null;
      return persona ? `O usuário está editando a persona “${persona.name}” (id ${persona.id}).` : null;
    }
    case "clausula": {
      const clause = id ? sources.clauses.get(id) : null;
      return clause ? `O usuário está editando a cláusula aprovada “${clause.title}” (id ${clause.id}).` : null;
    }
    case "lote": {
      const job = id ? sources.batches.getJob(id, ownerId) : null;
      if (!job) return null;
      const { done, failed } = job.counts;
      const counts = [plural(done, "pronta", "prontas"), plural(failed, "falha", "falhas")].join(", ");
      return `O usuário está vendo o lote “${job.name}” (id ${job.id}): ${plural(job.total, "minuta", "minutas")}; ${counts}.`;
    }
    case "nova_minuta":
      return `O usuário está no passo a passo de nova minuta.${extra}`;
    case "pagina":
      return detail ? `O usuário está na página “${detail}” do Magistral.` : null;
  }
}
