export const PERSONA_IDS = ["conservador", "moderno", "agressivo"] as const;

export type PersonaId = (typeof PERSONA_IDS)[number];

export interface PersonaSummary {
  id: PersonaId;
  label: string;
  description: string;
}

export const PERSONAS: Record<PersonaId, PersonaSummary> = {
  conservador: {
    id: "conservador",
    label: "Conservador / Tradicional",
    description: "Linguagem jurídica formal e rigorosa, no padrão dos grandes escritórios.",
  },
  moderno: {
    id: "moderno",
    label: "Moderno / Startup",
    description: "Linguagem clara, direta e ágil, sem juridiquês desnecessário.",
  },
  agressivo: {
    id: "agressivo",
    label: "Agressivo / Protetor",
    description: "Foco máximo em penalidades e garantias a favor da primeira parte informada.",
  },
};

export const PERSONA_LIST: PersonaSummary[] = PERSONA_IDS.map((id) => PERSONAS[id]);

export const DEFAULT_PERSONA_ID: PersonaId = "moderno";
