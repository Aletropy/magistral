export const STYLE_SLIDER_IDS = ["formality", "aggressiveness", "length"] as const;
export type StyleSliderId = (typeof STYLE_SLIDER_IDS)[number];
export type StyleSliders = Record<StyleSliderId, number>;

export const STYLE_SLIDER_MIN = 1;
export const STYLE_SLIDER_MAX = 5;
/** The middle level adds no instruction: the persona's own text decides. */
export const STYLE_SLIDER_NEUTRAL = 3;

export const DEFAULT_STYLE_SLIDERS: StyleSliders = {
  formality: STYLE_SLIDER_NEUTRAL,
  aggressiveness: STYLE_SLIDER_NEUTRAL,
  length: STYLE_SLIDER_NEUTRAL,
};

type NonNeutralLevel = 1 | 2 | 4 | 5;

interface StyleSliderDefinition {
  label: string;
  lowLabel: string;
  highLabel: string;
  instructions: Record<NonNeutralLevel, string>;
}

export const STYLE_SLIDERS: Record<StyleSliderId, StyleSliderDefinition> = {
  formality: {
    label: "Formalidade",
    lowLabel: "Coloquial",
    highLabel: "Solene",
    instructions: {
      1: "Use registro coloquial-profissional: tratamento direto, sem fórmulas jurídicas tradicionais.",
      2: "Prefira linguagem simples e direta, com o mínimo de termos técnicos.",
      4: "Eleve o registro: terminologia jurídica precisa e construções formais.",
      5: "Adote registro solene e estritamente técnico, no padrão de pareceres e contratos tradicionais.",
    },
  },
  aggressiveness: {
    label: "Agressividade",
    lowLabel: "Conciliadora",
    highLabel: "Protetora",
    instructions: {
      1: "Adote postura equilibrada e conciliatória: obrigações recíprocas e penalidades moderadas.",
      2: "Proteja o cliente sem impor ônus desproporcionais à outra parte.",
      4: "Favoreça claramente a primeira parte: penalidades firmes e prazos curtos para a outra parte.",
      5: "Blinde ao máximo a primeira parte: multas elevadas, rescisão imediata e responsabilidade ampliada da outra parte.",
    },
  },
  length: {
    label: "Extensão",
    lowLabel: "Enxuta",
    highLabel: "Exaustiva",
    instructions: {
      1: "Seja extremamente conciso: só o essencial, com poucas frases por cláusula.",
      2: "Seja conciso: evite desdobramentos que não mudem obrigações.",
      4: "Seja detalhado: desdobre hipóteses, prazos e procedimentos relevantes.",
      5: "Seja exaustivo: cubra todas as hipóteses previsíveis com parágrafos e incisos.",
    },
  },
};

/** One instruction per slider moved away from neutral, in slider order. */
export function styleSliderInstructions(sliders: StyleSliders): string[] {
  return STYLE_SLIDER_IDS.flatMap((id) => {
    const level = sliders[id];
    return level === STYLE_SLIDER_NEUTRAL ? [] : [STYLE_SLIDERS[id].instructions[level as NonNeutralLevel]];
  });
}
