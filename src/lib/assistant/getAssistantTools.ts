import "server-only";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { callJurisprudencias } from "@/lib/integrations/jurisprudencias/client";
import { getEmbedder } from "@/lib/llm/getEmbedder";
import { loadDraftInputs } from "@/lib/minuta/draftMinuta";
import { draftMinutaTask, draftTaskTitle } from "@/lib/minuta/draftMinutaTask";
import type { SuggestionCatalog } from "@/lib/minuta/draftSuggestion";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import type { AssistantTool } from "./tool";
import { createAdjustPersonaTool } from "./tools/adjustPersona";
import { createCreateClauseTool } from "./tools/createClause";
import { createEditMinutaTool } from "./tools/editMinuta";
import { createGenerateMinutaTool } from "./tools/generateMinuta";
import { createJurisprudenciaTools } from "./tools/jurisprudencia";
import { createListClausesTool } from "./tools/listClauses";
import { createListPersonasTool } from "./tools/listPersonas";
import { createListTasksTool } from "./tools/listTasks";
import { openPageTool } from "./tools/openPage";
import { createPrepareMinutaTool } from "./tools/prepareMinuta";
import { createReadMinutaTool } from "./tools/readMinuta";
import { createSearchHistoryTool } from "./tools/searchHistory";
import { createSearchLibraryTool } from "./tools/searchLibrary";

const LIBRARY_TOOL_NAME = "buscar_biblioteca";
const JURISPRUDENCIA_TOOL_NAMES: ReadonlySet<string> = new Set([
  "pesquisar_jurisprudencia",
  "consultar_decisao",
  "listar_tribunais",
]);

function catalog(): SuggestionCatalog {
  return {
    clauseIds: new Set(getClauseRepository().list().map((clause) => clause.id)),
    personaIds: new Set(getPersonaRepository().list().map((persona) => persona.id)),
  };
}

/** Every tool, wired to the app's repositories. */
function allTools(): AssistantTool[] {
  const minutas = getMinutaRepository();
  const personas = getPersonaRepository();
  const clauses = getClauseRepository();
  const tasks = getTaskRepository();
  return [
    createSearchLibraryTool({ library: getLibraryRepository(), embedder: getEmbedder }),
    createListPersonasTool({ personas }),
    createListClausesTool({ clauses }),
    createSearchHistoryTool({ minutas }),
    createReadMinutaTool({ minutas }),
    createListTasksTool({ tasks }),
    openPageTool,
    createPrepareMinutaTool({ tasks, catalog }),
    createGenerateMinutaTool({
      catalog,
      checkRequest(request) {
        const { persona, approvedClauses } = loadDraftInputs(request);
        return { personaName: persona.name, clauseTitles: approvedClauses.map((clause) => clause.title) };
      },
      // Loaded on use: the task worker imports the task registry, which imports the reply task using these tools.
      async enqueueDraft(ownerId, request) {
        const { enqueueTask } = await import("@/lib/tasks/getTaskWorker");
        return enqueueTask(draftMinutaTask, { ownerId, title: draftTaskTitle(request), payload: request });
      },
    }),
    createEditMinutaTool({ minutas }),
    createCreateClauseTool({ clauses }),
    createAdjustPersonaTool({ personas }),
    ...createJurisprudenciaTools({ call: callJurisprudencias }),
  ];
}

interface ToolAvailability {
  /** The conversation uses a non-empty library. */
  searchLibrary: boolean;
  /** The office's Jurisprudências.ai account is connected. */
  jurisprudencia: boolean;
}

/** The tools offered in a reply: the library and jurisprudence searches only when they can work. */
export function getAssistantTools({ searchLibrary, jurisprudencia }: ToolAvailability): AssistantTool[] {
  return allTools().filter((tool) => {
    if (tool.name === LIBRARY_TOOL_NAME) return searchLibrary;
    if (JURISPRUDENCIA_TOOL_NAMES.has(tool.name)) return jurisprudencia;
    return true;
  });
}

/** The action a waiting step names, to run it once the user confirms. */
export function findActionTool(name: string): Extract<AssistantTool, { kind: "action" }> | null {
  const tool = allTools().find((candidate) => candidate.name === name);
  return tool?.kind === "action" ? tool : null;
}
