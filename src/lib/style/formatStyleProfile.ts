import type { StyleProfile } from "./styleProfileSchema";

function quoteAll(items: string[]): string {
  return items.map((item) => `"${item}"`).join("; ");
}

/** Renders a style profile as prompt-ready pt-BR bullet lines, skipping empty fields. */
export function formatStyleProfile(profile: StyleProfile): string[] {
  const { sentenceLength } = profile;
  const lines = [
    `Estrutura: ${profile.structuralFramework}`,
    profile.sectionOrder.length > 0 && `Ordem das seções: ${profile.sectionOrder.join(" → ")}`,
    `Vocabulário: complexidade ${profile.vocabularyComplexity}. ${profile.vocabularyNotes}`,
    `Frases: média de ${Math.round(sentenceLength.averageWords)} palavras (${Math.round(sentenceLength.shortPercent)}% curtas, ${Math.round(sentenceLength.mediumPercent)}% médias, ${Math.round(sentenceLength.longPercent)}% longas). ${sentenceLength.notes}`,
    `Títulos: ${profile.headerConventions}${profile.headerExamples.length > 0 ? ` Exemplos: ${quoteAll(profile.headerExamples)}.` : ""}`,
    `Citações: ${profile.citationFormatting}`,
    `Tom: ${profile.tone}`,
    profile.recurringExpressions.length > 0 && `Expressões recorrentes: ${quoteAll(profile.recurringExpressions)}`,
    ...profile.formattingRules,
  ];
  return lines.filter((line): line is string => Boolean(line)).map((line) => line.trim());
}
