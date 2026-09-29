import { z } from "zod";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";
import {
  baseDocumentSchema,
  documentTypeStepSchema,
  minutaRequestFieldsSchema,
  minutaRequestSchema,
  type MinutaFormValues,
} from "./schema";

export const WIZARD_STEP_IDS = [
  "tipo",
  "inicio",
  "partes",
  "condicoes",
  "clausulas",
  "persona",
  "fundamentacao",
  "revisao",
] as const;
export type WizardStepId = (typeof WIZARD_STEP_IDS)[number];

/** What the office has that decides which optional steps are worth showing. */
export interface WizardContext {
  /** Approved clauses offered for the chosen document type. */
  applicableClauseCount: number;
  librarySourceCount: number;
}

export interface WizardStep {
  id: WizardStepId;
  title: string;
  /** One line under the title saying what the step asks for. */
  description: string;
  /** The guide's tips for this step, shown beside it. */
  guide: string[];
  /** Validates only this step's fields. */
  schema: z.ZodType;
  /** False hides the step: it would only ask about something the office doesn't have. */
  isRelevant: (context: WizardContext) => boolean;
}

const ALWAYS = () => true;

export const WIZARD_STEPS: readonly WizardStep[] = [
  {
    id: "tipo",
    title: "Que documento você precisa?",
    description: "Escolha o tipo; as próximas perguntas se ajustam a ele.",
    guide: [
      "O tipo define quem são as partes, quais condições perguntamos e as cláusulas usuais que a IA acrescenta.",
      "Se o documento não estiver na lista, escolha “Outro” e descreva-o, por exemplo “Termo de Cessão de Direitos Autorais”.",
    ],
    schema: documentTypeStepSchema,
    isRelevant: ALWAYS,
  },
  {
    id: "inicio",
    title: "Tem um modelo?",
    description: "Comece do zero ou a partir de um documento que a nova minuta deve seguir.",
    guide: [
      "Com um documento base (PDF ou DOCX), a IA segue a estrutura dele e redige no tom da persona escolhida.",
      "“Preencher com IA” lê o documento e sugere as partes e as condições. Você recebe um aviso quando terminar.",
      "Os dados das partes do modelo nunca são reaproveitados sem você confirmar.",
    ],
    schema: z.object({ baseDocument: baseDocumentSchema.nullable().default(null) }),
    isRelevant: ALWAYS,
  },
  {
    id: "partes",
    title: "Quem assina?",
    description: "O nome e o papel de cada parte. A qualificação é opcional.",
    guide: [
      "Os papéis já vêm do tipo de documento; mude se precisar.",
      "O que faltar na qualificação (CPF/CNPJ, endereço) vira um marcador [PREENCHER] na minuta, nunca um dado inventado.",
      "Se veio de um documento base, confira se as partes são as do novo negócio e não as do modelo.",
    ],
    schema: minutaRequestFieldsSchema.pick({ parties: true }),
    isRelevant: ALWAYS,
  },
  {
    id: "condicoes",
    title: "Condições essenciais",
    description: "Responda o que já souber; deixe em branco o que ainda não foi definido.",
    guide: [
      "Cada resposta vira uma condição que a minuta precisa respeitar.",
      "O que ficar em branco a IA resolve com a solução usual para o tipo, ou marca [PREENCHER] quando depende de você.",
      "Use “Outras condições” para qualquer pedido que não esteja nas perguntas.",
    ],
    schema: minutaRequestFieldsSchema.pick({ clauses: true }),
    isRelevant: ALWAYS,
  },
  {
    id: "clausulas",
    title: "Cláusulas aprovadas",
    description: "Textos já validados pelo escritório para este tipo de documento.",
    guide: [
      "Cláusulas aprovadas entram com o conteúdo preservado, na ordem em que você as arrastar.",
      "A IA só ajusta o tom e a numeração ao restante da minuta.",
    ],
    schema: minutaRequestFieldsSchema.pick({ approvedClauseIds: true }),
    isRelevant: (context) => context.applicableClauseCount > 0,
  },
  {
    id: "persona",
    title: "Qual o tom?",
    description: "A persona define o estilo da redação.",
    guide: [
      "Conservador segue o juridiquês tradicional; Moderno escreve de forma clara e direta; Agressivo endurece penalidades e garantias.",
      "Você pode criar personas próprias ou capturar o estilo de um documento em Personas.",
    ],
    schema: minutaRequestFieldsSchema.pick({ persona: true }),
    isRelevant: ALWAYS,
  },
  {
    id: "fundamentacao",
    title: "Fundamentar na biblioteca?",
    description: "Usar ou não as leis, decretos e pareceres da biblioteca jurídica.",
    guide: [
      "Com a biblioteca, a IA cita somente normas que estão nela e marca [PREENCHER: fundamento legal] quando falta uma fonte.",
      "Sem a biblioteca, a minuta não cita normas municipais específicas.",
    ],
    schema: minutaRequestFieldsSchema.pick({ useLibrary: true }),
    isRelevant: (context) => context.librarySourceCount > 0,
  },
  {
    id: "revisao",
    title: "Revisão",
    description: "Confira tudo e gere a minuta.",
    guide: [
      "A minuta é redigida em segundo plano; quando fica pronta, abre na página de revisão.",
      "Lá dá para revisar as alterações da IA uma a uma e baixar em Word ou PDF.",
    ],
    schema: minutaRequestSchema,
    isRelevant: ALWAYS,
  },
];

/** The steps worth showing to this office, in order. */
export function relevantSteps(context: WizardContext): WizardStep[] {
  return WIZARD_STEPS.filter((step) => step.isRelevant(context));
}

export function stepIndex(id: WizardStepId): number {
  return WIZARD_STEPS.findIndex((step) => step.id === id);
}

/** Field errors for one step (e.g. `{ "parties.0.name": "Informe o nome da parte." }`), empty when valid. */
export function validateStep(step: WizardStep, values: MinutaFormValues): Record<string, string> {
  const result = step.schema.safeParse(values);
  return result.success ? {} : collectFieldErrors(result.error);
}

/** The first step with an error, so the review can send the user straight to it. */
export function firstInvalidStep(values: MinutaFormValues, steps: readonly WizardStep[] = WIZARD_STEPS): WizardStep | null {
  return steps.find((step) => step.id !== "revisao" && Object.keys(validateStep(step, values)).length > 0) ?? null;
}
