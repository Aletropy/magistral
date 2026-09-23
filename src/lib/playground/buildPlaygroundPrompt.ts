import type { MinutaPrompt } from "@/lib/llm/types";
import type { PersonaStyle } from "@/lib/personas/types";
import { MISSING_DATA_PLACEHOLDER } from "@/lib/prompt/buildSystemPrompt";
import { buildExamplesSection, buildPersonaSections, toBulletList } from "@/lib/prompt/personaSections";

const REWRITE_RULES = [
  "Reescreva o texto de amostra no estilo descrito acima, em português do Brasil.",
  "Preserve o sentido e todos os dados concretos: partes, valores, percentuais e prazos. Conforme os ajustes de estilo, você pode reorganizar, condensar ou desdobrar o texto.",
  `Não invente dados. Se o estilo exigir um dado que o texto não traz, insira ${MISSING_DATA_PLACEHOLDER}.`,
  "Responda somente com o texto reescrito, em Markdown: títulos com `##`, listas numeradas para incisos e **negrito** para termos definidos. Sem tabelas, blocos de código ou HTML.",
  "Nenhuma saudação, introdução, comentário ou explicação antes ou depois do texto.",
];

/** Asks the model to rewrite a sample passage in the persona's style, for side-by-side tuning. */
export function buildPlaygroundPrompt(style: PersonaStyle, temperature: number, sampleText: string): MinutaPrompt {
  const system = [
    ...buildPersonaSections(style),
    `## Tarefa\n${toBulletList(REWRITE_RULES)}`,
    buildExamplesSection(style),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, user: `<texto_de_amostra>\n${sampleText}\n</texto_de_amostra>`, temperature };
}
