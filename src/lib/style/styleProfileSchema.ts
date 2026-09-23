import { z } from "zod";

export const VOCABULARY_COMPLEXITY_LEVELS = ["baixa", "média", "alta"] as const;

export const styleProfileSchema = z.object({
  structuralFramework: z
    .string()
    .describe("Como o documento é organizado: preâmbulo, qualificação, considerandos, cláusulas, fecho."),
  sectionOrder: z.array(z.string()).describe("Os títulos ou tipos de seção, na ordem em que aparecem."),
  vocabularyComplexity: z.enum(VOCABULARY_COMPLEXITY_LEVELS),
  vocabularyNotes: z.string().describe("Registro, jargão, latinismos, termos técnicos típicos."),
  sentenceLength: z.object({
    averageWords: z.number().describe("Média aproximada de palavras por frase."),
    shortPercent: z.number().describe("Percentual de frases com até 15 palavras."),
    mediumPercent: z.number().describe("Percentual de frases com 16 a 30 palavras."),
    longPercent: z.number().describe("Percentual de frases com mais de 30 palavras."),
    notes: z.string(),
  }),
  headerConventions: z.string().describe("Como os títulos são escritos: numeração, caixa, travessões, negrito."),
  headerExamples: z.array(z.string()).describe("Até 4 títulos copiados literalmente do documento."),
  citationFormatting: z.string().describe("Como leis, artigos e julgados são citados; 'nenhuma' se não houver."),
  tone: z.string().describe("A atitude do texto em relação às partes e ao leitor."),
  recurringExpressions: z.array(z.string()).describe("Até 8 expressões características usadas no documento."),
  formattingRules: z.array(z.string()).describe("Até 8 regras concretas para reproduzir o estilo."),
});

export type StyleProfile = z.infer<typeof styleProfileSchema>;

/** What Gemini returns: the profile plus suggestions for a new persona and verbatim excerpts. */
export const styleExtractionSchema = z.object({
  profile: styleProfileSchema,
  suggestedName: z
    .string()
    .describe(
      "Nome curto da persona que descreve o tipo de documento e o estilo, ex.: 'PGM - Parecer Tributário'. Nunca use nome de pessoa.",
    ),
  suggestedSystemInstruction: z
    .string()
    .describe("Uma ou duas frases começando com 'Você é', descrevendo quem escreve neste estilo."),
  suggestedToneParameters: z.array(z.string()).describe("Até 8 regras de redação imperativas e verificáveis."),
  keyExcerpts: z
    .array(z.string())
    .describe("2 ou 3 trechos copiados literalmente do documento, cada um com 1 a 3 parágrafos."),
});

export type StyleExtraction = z.infer<typeof styleExtractionSchema>;

export const STYLE_EXTRACTION_JSON_SCHEMA = z.toJSONSchema(styleExtractionSchema);
