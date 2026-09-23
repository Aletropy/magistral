import type { MinutaPrompt } from "@/lib/llm/types";
import { toBulletList } from "@/lib/prompt/personaSections";

const ANALYSIS_RULES = [
  "Analise somente a forma de escrever, não o mérito jurídico.",
  "Descreva a estrutura, a complexidade do vocabulário, a distribuição do tamanho das frases, as convenções de títulos, a formatação de citações e o tom.",
  "As regras de redação e de formatação devem ser imperativas e verificáveis (ex.: \"Numere as cláusulas por extenso em caixa alta\").",
  "Os trechos-chave devem ser copiados literalmente do documento, sem corrigir nem resumir, e mostrar o estilo em seu melhor momento.",
  "Nunca copie nomes, CPFs, CNPJs ou endereços reais para as sugestões de persona; nos trechos-chave, prefira passagens sem dados pessoais.",
  "Escreva todos os campos em português do Brasil.",
];

/** Asks for a JSON style profile of the reference document, which goes in the user turn. */
export function buildStyleExtractionPrompt(documentText: string, temperature: number): MinutaPrompt {
  return {
    system: `Você é um linguista forense especializado em redação jurídica brasileira. Sua tarefa é extrair o perfil de estilo de um documento de referência para que outro redator consiga reproduzir exatamente a mesma voz, formatação e estrutura.\n\n## Regras\n${toBulletList(ANALYSIS_RULES)}`,
    user: `<documento_de_referencia>\n${documentText}\n</documento_de_referencia>`,
    temperature,
  };
}
