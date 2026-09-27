import "server-only";
import { EMBEDDING_PROVIDER_ENV_VAR, resolveEmbeddingProvider } from "./embeddings";
import { getOpenRouterRouting } from "./openrouter/client";
import { PRIVATE_ROUTING } from "./openrouter/config";
import { activeLlmProvider } from "./providerRegistry";

export type PrivacyLevel = "protected" | "warning";

export interface PrivacyStatement {
  level: PrivacyLevel;
  /** Where drafting, chat and document reading are sent. */
  drafting: string;
  /** Where the legal library is indexed. */
  library: string;
}

const LIBRARY_STATEMENTS = {
  local: "A biblioteca jurídica é indexada neste servidor; os textos não saem da máquina para isso.",
  gemini: "A biblioteca jurídica é indexada pela API do Google Gemini.",
} as const;

/**
 * Describes, in plain pt-BR, where the office's documents and party data go with the current settings, so
 * the admin (at setup and on the usage page) knows what the providers may keep.
 */
export function describeDataPrivacy(): PrivacyStatement {
  const library = LIBRARY_STATEMENTS[resolveEmbeddingProvider(process.env[EMBEDDING_PROVIDER_ENV_VAR])];
  switch (activeLlmProvider()) {
    case "openrouter": {
      const isPrivate = getOpenRouterRouting().zdr === PRIVATE_ROUTING.zdr;
      return isPrivate
        ? {
            level: "protected",
            drafting:
              "Minutas, conversas e documentos vão ao OpenRouter somente para provedores sem retenção de dados: nada é guardado nem usado para treinar modelos.",
            library,
          }
        : {
            level: "warning",
            drafting:
              "OPENROUTER_ALLOW_DATA_COLLECTION está ativado: provedores gratuitos podem guardar e usar os textos enviados, inclusive dados das partes, para treinar modelos.",
            library,
          };
    }
    case "gemini":
      return {
        level: "warning",
        drafting:
          "Minutas, conversas e documentos vão à API do Google Gemini. Com chave do plano gratuito, o Google pode usar os textos para melhorar seus produtos; use uma chave com faturamento ativo para evitar isso.",
        library,
      };
    case "anthropic":
      return {
        level: "protected",
        drafting:
          "Minutas, conversas e documentos vão à API da Anthropic, que não usa dados da API para treinar modelos.",
        library,
      };
  }
}
