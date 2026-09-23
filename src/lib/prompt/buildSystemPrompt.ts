import type { PersonaStyle } from "@/lib/personas/types";

export const MISSING_DATA_PLACEHOLDER = "[PREENCHER: descrição do dado]";

const DRAFTING_RULES = [
  "Escreva em português do Brasil, observando a legislação brasileira aplicável ao tipo de documento.",
  "Proibido usar clichês e fórmulas vazias (\"por ser a mais pura expressão da verdade\", \"de comum acordo e livre vontade\", \"para que surta seus jurídicos e legais efeitos\").",
  "Prefira frases curtas. Nas cláusulas de risco (pagamento, multa, rescisão, responsabilidade, confidencialidade, foro) tome posição explícita com prazos, percentuais e consequências concretas; nunca deixe a decisão em aberto.",
  `Não invente dados das partes nem valores. Quando faltar um dado essencial (CPF/CNPJ, endereço, preço, datas), insira o marcador ${MISSING_DATA_PLACEHOLDER}.`,
  "Incorpore todas as cláusulas específicas solicitadas pelo usuário e complete o documento com as cláusulas usuais para o seu tipo.",
  "Encerre com local, data e campos de assinatura para cada parte e para duas testemunhas.",
];

const OUTPUT_RULES = [
  "Responda somente com a minuta, em Markdown estruturado.",
  "A primeira linha é o título do documento, como cabeçalho de nível 1 (`# TÍTULO`).",
  "Cada cláusula começa com um cabeçalho de nível 2 (`## ...`); use listas numeradas para incisos e **negrito** para termos definidos.",
  "Não use tabelas, blocos de código, citações, imagens, links ou HTML.",
  "Nenhuma saudação, introdução, comentário, explicação ou observação antes ou depois da minuta (nada de \"Aqui está o seu documento\").",
];

function toBulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatExamples(examples: string[]): string {
  return examples.map((example) => `<exemplo>\n${example}\n</exemplo>`).join("\n\n");
}

/** The persona's own text comes first; the drafting and output rules are fixed guardrails. */
export function buildSystemPrompt(style: PersonaStyle): string {
  return [
    style.systemInstruction,
    style.toneParameters.length > 0 && `## Tom de voz\n${toBulletList(style.toneParameters)}`,
    `## Regras de redação\n${toBulletList(DRAFTING_RULES)}`,
    `## Formato de saída\n${toBulletList(OUTPUT_RULES)}`,
    style.examples.length > 0 &&
      `## Exemplos de tom (imite o estilo, não o conteúdo)\n${formatExamples(style.examples)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
