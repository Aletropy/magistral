import { describe, expect, it } from "vitest";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { PERSONA_IDS } from "@/lib/personas/catalog";
import { PERSONA_PROMPT_STYLES } from "@/lib/personas/promptStyles";
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

describe("buildSystemPrompt", () => {
  it.each(PERSONA_IDS)("starts with the %s persona role", (personaId) => {
    const firstLine = buildSystemPrompt(personaId).split("\n")[0];
    expect(firstLine).toBe(PERSONA_PROMPT_STYLES[personaId].role);
  });

  it("requires Markdown-only output with no greeting", () => {
    const prompt = buildSystemPrompt("moderno");
    expect(prompt).toContain("somente com a minuta, em Markdown");
    expect(prompt).toContain("Nenhuma saudação");
  });

  it("produces a distinct prompt per persona", () => {
    const prompts = new Set(PERSONA_IDS.map(buildSystemPrompt));
    expect(prompts.size).toBe(PERSONA_IDS.length);
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
