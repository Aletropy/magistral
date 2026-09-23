export const OTHER_DOCUMENT_TYPE_ID = "outro";

export const DOCUMENT_TYPE_IDS = [
  "nda",
  "prestacao-servicos",
  "compra-venda",
  "locacao",
  OTHER_DOCUMENT_TYPE_ID,
] as const;

export type DocumentTypeId = (typeof DOCUMENT_TYPE_IDS)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeId, string> = {
  nda: "Acordo de Confidencialidade (NDA)",
  "prestacao-servicos": "Contrato de Prestação de Serviços",
  "compra-venda": "Contrato de Compra e Venda",
  locacao: "Contrato de Locação",
  outro: "Outro (especificar)",
};

export const DEFAULT_DOCUMENT_TYPE_ID: DocumentTypeId = "prestacao-servicos";
