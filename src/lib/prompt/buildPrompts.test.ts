import { describe, expect, it } from "vitest";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { BUILTIN_PERSONAS } from "@/lib/personas/seeds";
import { DEFAULT_STYLE_SLIDERS, STYLE_SLIDERS } from "@/lib/personas/styleSliders";
import type { PersonaStyle } from "@/lib/personas/types";
import { buildSystemPrompt } from "./buildSystemPrompt";
import { buildRetrievalQuery, buildUserPrompt } from "./buildUserPrompt";

const REQUEST: MinutaRequest = {
  documentType: "prestacao-servicos",
  customDocumentType: "",
  parties: [
    { name: "Acme Ltda.", role: "Contratante", qualification: "" },
    { name: "Maria Silva", role: "Contratada", qualification: "CPF 000.000.000-00" },
  ],
  clauses: "",
  persona: "agressivo",
  useLibrary: false,
};

const MINIMAL_STYLE: PersonaStyle = {
  systemInstruction: "Você é um redator jurídico.",
  toneParameters: [],
  examples: [],
  negativeConstraints: [],
  styleSliders: DEFAULT_STYLE_SLIDERS,
  styleProfile: null,
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
    const prompts = new Set(BUILTIN_PERSONAS.map((persona) => buildSystemPrompt(persona)));
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

  it("adds the captured style profile after the tone section", () => {
    const prompt = buildSystemPrompt({
      ...MINIMAL_STYLE,
      styleProfile: {
        structuralFramework: "Relatório, fundamentação e conclusão.",
        sectionOrder: [],
        vocabularyComplexity: "alta",
        vocabularyNotes: "",
        sentenceLength: { averageWords: 25, shortPercent: 20, mediumPercent: 50, longPercent: 30, notes: "" },
        headerConventions: "Algarismos romanos.",
        headerExamples: [],
        citationFormatting: "nenhuma",
        tone: "Técnico.",
        recurringExpressions: [],
        formattingRules: [],
      },
    });
    expect(prompt).toContain("## Perfil de estilo de referência");
    expect(prompt).toContain("- Estrutura: Relatório, fundamentação e conclusão.");
    expect(prompt.indexOf("## Perfil de estilo")).toBeLessThan(prompt.indexOf("## Regras de redação"));
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

describe("library grounding", () => {
  const SOURCES = [
    { ref: "F1", title: 'Lei "Complementar" 7', label: "Art. 5º", context: "TÍTULO I", text: "O imposto incide." },
  ];

  it("adds the grounding rules only when the prompt carries library sources", () => {
    expect(buildSystemPrompt(MINIMAL_STYLE, { withLibrary: true })).toContain("## Fundamentação");
    expect(buildSystemPrompt(MINIMAL_STYLE)).not.toContain("## Fundamentação");
  });

  it("puts the sources in a tagged block before the request, with safe attributes", () => {
    const prompt = buildUserPrompt(REQUEST, SOURCES);
    expect(prompt.startsWith(
      `<fontes>\n<fonte id="F1" titulo="Lei 'Complementar' 7" trecho="Art. 5º" contexto="TÍTULO I">\nO imposto incide.\n</fonte>\n</fontes>`,
    )).toBe(true);
    expect(buildUserPrompt(REQUEST)).not.toContain("<fontes>");
  });

  it("searches the library with the document type and the requested clauses", () => {
    expect(buildRetrievalQuery({ ...REQUEST, clauses: "Multa de 2%." })).toBe(
      "Contrato de Prestação de Serviços\nMulta de 2%.",
    );
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
