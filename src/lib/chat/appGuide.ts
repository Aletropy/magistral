import { BATCHES_PATH, NEW_BATCH_PATH } from "@/lib/batch/paths";
import { CLAUSES_PATH } from "@/lib/clauses/paths";
import { HISTORY_PATH, HOME_PATH } from "@/lib/minutas/paths";
import { PERSONAS_PATH, STYLE_CAPTURE_PATH } from "@/lib/personas/paths";
import { LIBRARY_PATH } from "@/lib/rag/paths";
import { TASKS_PATH } from "@/lib/tasks/paths";
import { USAGE_PATH } from "@/lib/usage/paths";
import { ASSISTANT_PATH } from "./paths";

interface GuideEntry {
  feature: string;
  path: string;
  howTo: string;
}

/** What the assistant knows about Magistral, one entry per feature, so it can walk users through the app. */
export const APP_GUIDE: readonly GuideEntry[] = [
  {
    feature: "Gerar minuta — passo a passo",
    path: HOME_PATH,
    howTo:
      "Aba “Passo a passo”: ponto de partida (do zero ou a partir de um documento base), tipo de documento, partes, cláusulas, persona, fundamentação e revisão. Cada etapa tem um guia ao lado. O rascunho fica salvo no navegador.",
  },
  {
    feature: "Gerar minuta — formulário completo",
    path: HOME_PATH,
    howTo: "Aba “Formulário completo”: todos os campos numa página só, para quem já sabe o que quer.",
  },
  {
    feature: "Documento base",
    path: HOME_PATH,
    howTo:
      "Envie um PDF ou DOCX que a nova minuta deve seguir. “Preencher o formulário com IA” lê o documento e sugere tipo, partes e cláusulas; o usuário revisa e aplica. A minuta segue a estrutura do modelo, no tom da persona, com os dados das partes informadas.",
  },
  {
    feature: "Geração em segundo plano e notificações",
    path: TASKS_PATH,
    howTo:
      "Toda ação demorada (gerar minuta, ler documento, indexar a biblioteca, capturar estilo, responder no Advogado IA) roda em segundo plano. O sino no topo mostra o andamento e as notificações; dá para ativar avisos do sistema. Em Tarefas é possível cancelar ou repetir.",
  },
  {
    feature: "Histórico e revisão",
    path: HISTORY_PATH,
    howTo:
      "Toda minuta gerada fica salva. Ao abrir uma, é possível baixar em Word ou PDF e, em “Revisar alterações”, aceitar ou rejeitar cada mudança da IA em relação às cláusulas aprovadas ou a um texto original. Também dá para conversar com o Advogado IA sobre a minuta.",
  },
  {
    feature: "Personas",
    path: PERSONAS_PATH,
    howTo:
      "Definem o tom de voz: instrução, parâmetros de tom, termos proibidos, controles de formalidade, agressividade e extensão, temperatura e exemplos. Há um teste para ver a persona reescrevendo um texto de amostra.",
  },
  {
    feature: "Capturar estilo",
    path: STYLE_CAPTURE_PATH,
    howTo: "Envie uma minuta ou parecer; a IA extrai o estilo e sugere uma nova persona ou ajustes numa existente.",
  },
  {
    feature: "Biblioteca jurídica",
    path: LIBRARY_PATH,
    howTo:
      "Leis, decretos e pareceres (PDF ou DOCX, por envio ou sincronizando uma pasta). As minutas podem se fundamentar só nela, e o Advogado IA a consulta para responder.",
  },
  {
    feature: "Cláusulas aprovadas",
    path: CLAUSES_PATH,
    howTo:
      "Textos validados pela equipe, por tipo de documento. Na minuta, entram com o conteúdo preservado e na ordem escolhida (arrastando).",
  },
  {
    feature: "Lotes",
    path: `${BATCHES_PATH} (novo lote em ${NEW_BATCH_PATH})`,
    howTo:
      "Gera uma minuta por linha de uma planilha CSV ou XLSX: o modelo usa {{coluna}} nos campos de texto. Ao final baixa-se um ZIP em Word ou PDF.",
  },
  {
    feature: "Uso",
    path: USAGE_PATH,
    howTo: "Consumo de IA por dia, operação e modelo: chamadas, tokens, custo estimado e latência.",
  },
  {
    feature: "Advogado IA",
    path: ASSISTANT_PATH,
    howTo:
      "Este assistente. As conversas ficam salvas. O botão “Criar minuta a partir desta conversa” abre o passo a passo já preenchido com o que foi combinado.",
  },
];

export function formatAppGuide(): string {
  return APP_GUIDE.map((entry) => `- **${entry.feature}** (${entry.path}): ${entry.howTo}`).join("\n");
}
