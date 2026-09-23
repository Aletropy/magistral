import { z } from "zod";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";
import {
  baseDocumentSchema,
  documentTypeStepSchema,
  minutaRequestFieldsSchema,
  minutaRequestSchema,
  type MinutaFormValues,
} from "./schema";

export const WIZARD_STEP_IDS = ["inicio", "tipo", "partes", "clausulas", "persona", "fundamentacao", "revisao"] as const;
export type WizardStepId = (typeof WIZARD_STEP_IDS)[number];

export interface WizardStep {
  id: WizardStepId;
  title: string;
  /** One line under the title saying what the step asks for. */
  description: string;
  /** The guide's tips for this step, shown beside it. */
  guide: string[];
  /** Validates only this step's fields. */
  schema: z.ZodType;
}

export const WIZARD_STEPS: readonly WizardStep[] = [
  {
    id: "inicio",
    title: "Ponto de partida",
    description: "Comece do zero ou a partir de um documento que a nova minuta deve seguir.",
    guide: [
      "Do zero: você informa tudo nas próximas etapas.",
      "Com um documento base (PDF ou DOCX), a IA copia a estrutura e as soluções dele e redige no tom da persona escolhida.",
      "“Preencher com IA” lê o documento e sugere o tipo, as partes e as cláusulas. Pode sair da página enquanto isso: você recebe um aviso quando terminar.",
      "Os dados das partes do documento base nunca são reaproveitados sem você confirmar.",
    ],
    schema: z.object({ baseDocument: baseDocumentSchema.nullable().default(null) }),
  },
  {
    id: "tipo",
    title: "Tipo de documento",
    description: "Que documento você precisa?",
    guide: [
      "O tipo define as cláusulas usuais que a IA acrescenta e quais cláusulas aprovadas aparecem na etapa de cláusulas.",
      "Se o documento não estiver na lista, escolha “Outro” e descreva-o, por exemplo “Termo de Cessão de Direitos Autorais”.",
    ],
    schema: documentTypeStepSchema,
  },
  {
    id: "partes",
    title: "Partes",
    description: "Quem assina o documento e em que papel.",
    guide: [
      "Informe o nome ou a razão social e o papel de cada parte (Contratante, Locador, Parte Reveladora…).",
      "A qualificação (CPF/CNPJ, endereço, representante) é opcional: o que faltar vira um marcador [PREENCHER] na minuta, nunca um dado inventado.",
      "Se veio de um documento base, confira se as partes são as do novo negócio e não as do modelo.",
    ],
    schema: minutaRequestFieldsSchema.pick({ parties: true }),
  },
  {
    id: "clausulas",
    title: "Cláusulas",
    description: "O que o documento precisa dizer.",
    guide: [
      "Cláusulas aprovadas são textos já validados pela sua equipe: entram com o conteúdo preservado, na ordem em que você as arrastar.",
      "Cláusulas específicas são pedidos livres: prazos, valores, multas, reajuste, foro.",
      "Sem nenhum pedido, a IA usa as cláusulas usuais do tipo de documento.",
    ],
    schema: minutaRequestFieldsSchema.pick({ clauses: true, approvedClauseIds: true }),
  },
  {
    id: "persona",
    title: "Persona",
    description: "O tom de voz da minuta.",
    guide: [
      "A persona define o estilo: vocabulário, tamanho das frases, rigidez e o quanto a minuta protege seu cliente.",
      "Conservador segue o juridiquês tradicional; Moderno escreve de forma clara e direta; Agressivo endurece penalidades e garantias.",
      "Você pode criar personas próprias ou capturar o estilo de um documento em Personas.",
    ],
    schema: minutaRequestFieldsSchema.pick({ persona: true }),
  },
  {
    id: "fundamentacao",
    title: "Fundamentação",
    description: "Usar ou não a biblioteca jurídica.",
    guide: [
      "Com a biblioteca, a IA cita somente leis, decretos e pareceres que estão nela e marca [PREENCHER: fundamento legal] quando falta uma fonte.",
      "Sem a biblioteca, a minuta não cita normas municipais específicas.",
      "Dúvidas sobre o que a biblioteca diz? Pergunte ao Advogado IA.",
    ],
    schema: minutaRequestFieldsSchema.pick({ useLibrary: true }),
  },
  {
    id: "revisao",
    title: "Revisão",
    description: "Confira tudo e gere a minuta.",
    guide: [
      "A minuta é redigida em segundo plano e fica salva no histórico; você é avisado quando ela ficar pronta.",
      "Depois de gerada, dá para revisar as alterações da IA uma a uma e baixar em Word ou PDF.",
    ],
    schema: minutaRequestSchema,
  },
];

export function stepIndex(id: WizardStepId): number {
  return WIZARD_STEPS.findIndex((step) => step.id === id);
}

/** Field errors for one step (e.g. `{ "parties.0.name": "Informe o nome da parte." }`), empty when valid. */
export function validateStep(step: WizardStep, values: MinutaFormValues): Record<string, string> {
  const result = step.schema.safeParse(values);
  return result.success ? {} : collectFieldErrors(result.error);
}

/** The first step with an error, so the review can send the user straight to it. */
export function firstInvalidStep(values: MinutaFormValues): WizardStep | null {
  return WIZARD_STEPS.find((step) => step.id !== "revisao" && Object.keys(validateStep(step, values)).length > 0) ?? null;
}
