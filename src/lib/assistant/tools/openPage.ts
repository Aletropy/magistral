import { z } from "zod";
import { ASSISTANT_PATH } from "@/lib/chat/paths";
import { BATCHES_PATH } from "@/lib/batch/paths";
import { CLAUSES_PATH, NEW_CLAUSE_PATH, clauseEditPath } from "@/lib/clauses/paths";
import { AppError } from "@/lib/errors/AppError";
import { HTTP_UNPROCESSABLE_CONTENT } from "@/lib/http/status";
import { HISTORY_PATH, HOME_PATH, NEW_MINUTA_PATH, minutaPath } from "@/lib/minutas/paths";
import { NEW_PERSONA_PATH, PERSONAS_PATH, STYLE_CAPTURE_PATH, personaEditPath } from "@/lib/personas/paths";
import { LIBRARY_PATH } from "@/lib/rag/paths";
import { TASKS_PATH } from "@/lib/tasks/paths";
import { defineReadTool } from "../tool";

const MAX_ID_CHARS = 64;
const ID_REQUIRED_MESSAGE = "Esta página precisa do id do item.";

interface PageTarget {
  label: string;
  href: string | ((id: string) => string);
}

/** Pages the assistant may point to; the ones for one item take its id. */
const PAGES = {
  inicio: { label: "Ir para o início", href: HOME_PATH },
  nova_minuta: { label: "Abrir o passo a passo da nova minuta", href: NEW_MINUTA_PATH },
  historico: { label: "Abrir o histórico", href: HISTORY_PATH },
  minuta: { label: "Abrir a minuta", href: minutaPath },
  personas: { label: "Abrir as personas", href: PERSONAS_PATH },
  nova_persona: { label: "Criar uma persona", href: NEW_PERSONA_PATH },
  persona: { label: "Abrir a persona", href: personaEditPath },
  capturar_estilo: { label: "Capturar o estilo de um documento", href: STYLE_CAPTURE_PATH },
  clausulas: { label: "Abrir as cláusulas aprovadas", href: CLAUSES_PATH },
  nova_clausula: { label: "Criar uma cláusula", href: NEW_CLAUSE_PATH },
  clausula: { label: "Abrir a cláusula", href: clauseEditPath },
  biblioteca: { label: "Abrir a biblioteca", href: LIBRARY_PATH },
  lotes: { label: "Abrir a geração em lote", href: BATCHES_PATH },
  tarefas: { label: "Abrir as tarefas", href: TASKS_PATH },
  assistente: { label: "Abrir as conversas", href: ASSISTANT_PATH },
} satisfies Record<string, PageTarget>;

const PAGE_IDS = Object.keys(PAGES) as [keyof typeof PAGES, ...(keyof typeof PAGES)[]];

export const openPageTool = defineReadTool({
  name: "abrir_pagina",
  description:
    "Mostra ao usuário um botão para abrir uma página do Magistral. Use quando ele quiser ir a algum lugar ou quando o próximo passo acontece em outra página. Páginas de um item (minuta, persona, cláusula) precisam do id.",
  input: z.object({
    pagina: z.enum(PAGE_IDS),
    id: z.string().trim().max(MAX_ID_CHARS).optional(),
  }),
  progressLabel: "Preparando o link",
  async run({ pagina, id }) {
    const target: PageTarget = PAGES[pagina];
    let href: string;
    if (typeof target.href === "string") href = target.href;
    else if (id) href = target.href(id);
    else throw new AppError(HTTP_UNPROCESSABLE_CONTENT, ID_REQUIRED_MESSAGE);
    return {
      output: "O botão foi mostrado ao usuário abaixo da resposta.",
      summary: target.label,
      card: { type: "link", href, label: target.label },
    };
  },
});
