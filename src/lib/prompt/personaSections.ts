import { styleSliderInstructions } from "@/lib/personas/styleSliders";
import type { PersonaStyle } from "@/lib/personas/types";

export function toBulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function quote(term: string): string {
  return `"${term}"`;
}

/** Who the model is and how it writes: the persona's own text, first line first. Empty sections are skipped. */
export function buildPersonaSections(style: PersonaStyle): string[] {
  const adjustments = styleSliderInstructions(style.styleSliders);

  return [
    style.systemInstruction,
    style.toneParameters.length > 0 && `## Tom de voz\n${toBulletList(style.toneParameters)}`,
    adjustments.length > 0 && `## Ajustes de estilo\n${toBulletList(adjustments)}`,
    style.negativeConstraints.length > 0 &&
      `## Palavras e expressões proibidas\nNunca use as palavras ou expressões abaixo, nem suas variações de gênero e número:\n${toBulletList(style.negativeConstraints.map(quote))}`,
  ].filter((section): section is string => Boolean(section));
}

/** Few-shot samples, each in its own block; null when the persona has none. */
export function buildExamplesSection(style: PersonaStyle): string | null {
  if (style.examples.length === 0) return null;
  const blocks = style.examples.map((example) => `<exemplo>\n${example}\n</exemplo>`).join("\n\n");
  return `## Exemplos de tom (imite o estilo, não o conteúdo)\n${blocks}`;
}
