import { describe, expect, it } from "vitest";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { BUILTIN_PERSONAS } from "@/lib/personas/seeds";
import { DEFAULT_STYLE_SLIDERS, STYLE_SLIDERS } from "@/lib/personas/styleSliders";
import type { PersonaStyle } from "@/lib/personas/types";
import { buildSystemPrompt } from "./buildSystemPrompt";
import { buildUserPrompt } from "./buildUserPrompt";

const REQUEST: MinutaRequest = {
  documentType: "prestacao-servicos",
  customDocumentType: "",
  parties: [
    { name: "Acme Ltda.", role: "Contratante", qualification: "" },
    { name: "Maria Silva", role: "Contratada", qualification: "CPF 000.000.000-00" },
  ],
  clauses: "",
  persona: "agressivo",
};

const MINIMAL_STYLE: PersonaStyle = {
  systemInstruction: "Você é um redator jurídico.",
  toneParameters: [],
  examples: [],
  negativeConstraints: [],
  styleSliders: DEFAULT_STYLE_SLIDERS,
};

describe("buildSystemPrompt", () => {
  it.each(BUILTIN_PERSONAS.map((persona) => [persona.id, persona] as const))(
    "starts with the %s persona's system instruction",
    (_, persona) => {
      const firstLine = buildSystemPrompt(persona).split("\n")[0];
      expect(firstLine).toBe(persona.systemInstruction);
    },
  );

  it("requires Markdown-only output with no greeting", () => {
    const prompt = buildSystemPrompt(MINIMAL_STYLE);
    expect(prompt).toContain("somente com a minuta, em Markdown");
    expect(prompt).toContain("Nenhuma saudação");
  });

  it("produces a distinct prompt per persona", () => {
    const prompts = new Set(BUILTIN_PERSONAS.map(buildSystemPrompt));
    expect(prompts.size).toBe(BUILTIN_PERSONAS.length);
  });

  it("lists every tone parameter and wraps each example in its own block", () => {
    const prompt = buildSystemPrompt({
      ...MINIMAL_STYLE,
      toneParameters: ["Use voz ativa.", "Limite parágrafos a 3 frases."],
      examples: ["Exemplo A", "Exemplo B"],
    });
    expect(prompt).toContain("- Use voz ativa.\n- Limite parágrafos a 3 frases.");
    expect(prompt).toContain("<exemplo>\nExemplo A\n</exemplo>\n\n<exemplo>\nExemplo B\n</exemplo>");
  });

  it("omits the tone, adjustment, forbidden-term and example sections when the persona has none", () => {
    const prompt = buildSystemPrompt(MINIMAL_STYLE);
    expect(prompt).not.toContain("## Tom de voz");
    expect(prompt).not.toContain("## Ajustes de estilo");
    expect(prompt).not.toContain("## Palavras e expressões proibidas");
    expect(prompt).not.toContain("<exemplo>");
  });

  it("adds slider adjustments and quoted forbidden terms", () => {
    const prompt = buildSystemPrompt({
      ...MINIMAL_STYLE,
      styleSliders: { ...DEFAULT_STYLE_SLIDERS, formality: 5 },
      negativeConstraints: ["outrossim", "posto isto"],
    });
    expect(prompt).toContain(`## Ajustes de estilo\n- ${STYLE_SLIDERS.formality.instructions[5]}`);
    expect(prompt).toContain('- "outrossim"\n- "posto isto"');
  });
});

describe("buildUserPrompt", () => {
  it("lists every party with its role and qualification", () => {
    const prompt = buildUserPrompt(REQUEST);
    expect(prompt).toContain("1. Acme Ltda., na qualidade de Contratante. Qualificação: não informada");
    expect(prompt).toContain("2. Maria Silva, na qualidade de Contratada. Qualificação: CPF 000.000.000-00");
  });

  it("uses the document type label, or the custom description for 'outro'", () => {
    expect(buildUserPrompt(REQUEST)).toContain("Contrato de Prestação de Serviços");
    const custom = buildUserPrompt({
      ...REQUEST,
      documentType: "outro",
      customDocumentType: "Termo de Cessão de Direitos",
    });
    expect(custom).toContain("Termo de Cessão de Direitos");
  });

  it("asks for the usual clauses when none are given", () => {
    expect(buildUserPrompt(REQUEST)).toContain("cláusulas usuais");
    expect(buildUserPrompt({ ...REQUEST, clauses: "Foro de Curitiba." })).toContain("Foro de Curitiba.");
  });
});
