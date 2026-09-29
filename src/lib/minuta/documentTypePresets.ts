import type { DocumentTypeId } from "./documentTypes";

/** One thing the wizard asks for a document type; the answer becomes a line of the minuta's conditions. */
export interface ConditionQuestion {
  id: string;
  label: string;
  placeholder: string;
}

export interface DocumentTypePreset {
  /** One line under the type's card. */
  summary: string;
  /** The usual roles of the first parties, in order (e.g. Locador, Locatário). */
  roles: string[];
  /** The essential conditions to ask for, in the order a lawyer would discuss them. */
  questions: ConditionQuestion[];
}

const FORUM: ConditionQuestion = { id: "foro", label: "Foro", placeholder: "Ex.: Comarca de Porto Alegre/RS" };

export const DOCUMENT_TYPE_PRESETS: Record<DocumentTypeId, DocumentTypePreset> = {
  locacao: {
    summary: "Aluguel de imóvel residencial ou comercial.",
    roles: ["Locador", "Locatário"],
    questions: [
      { id: "imovel", label: "Imóvel", placeholder: "Ex.: Apartamento na Rua das Flores, 100, ap. 201, Centro" },
      { id: "aluguel", label: "Aluguel e vencimento", placeholder: "Ex.: R$ 2.500,00 por mês, até o dia 5" },
      { id: "prazo", label: "Prazo da locação", placeholder: "Ex.: 30 meses a partir de 1º/11/2026" },
      { id: "reajuste", label: "Reajuste", placeholder: "Ex.: anual pelo IPCA" },
      { id: "garantia", label: "Garantia", placeholder: "Ex.: caução de três aluguéis" },
      { id: "multa", label: "Multa por rescisão antecipada", placeholder: "Ex.: três aluguéis, proporcional ao tempo restante" },
      FORUM,
    ],
  },
  "prestacao-servicos": {
    summary: "Serviços de um profissional ou empresa para um cliente.",
    roles: ["Contratante", "Contratada"],
    questions: [
      { id: "objeto", label: "Serviços contratados", placeholder: "Ex.: identidade visual e site institucional" },
      { id: "preco", label: "Preço e pagamento", placeholder: "Ex.: R$ 12.000,00 em três parcelas mensais" },
      { id: "prazo", label: "Prazo e entregas", placeholder: "Ex.: 60 dias, com entregas quinzenais" },
      { id: "multa", label: "Multa por atraso ou descumprimento", placeholder: "Ex.: 2% ao mês sobre a parcela em atraso" },
      { id: "propriedade", label: "Direitos sobre o resultado", placeholder: "Ex.: cedidos ao contratante após o pagamento" },
      FORUM,
    ],
  },
  "compra-venda": {
    summary: "Venda de um bem, móvel ou imóvel.",
    roles: ["Vendedor", "Comprador"],
    questions: [
      { id: "bem", label: "Bem vendido", placeholder: "Ex.: veículo Fiat Uno 2018, placa ABC-1D23" },
      { id: "preco", label: "Preço e pagamento", placeholder: "Ex.: R$ 35.000,00, sendo 50% no ato e 50% em 30 dias" },
      { id: "entrega", label: "Entrega e transferência", placeholder: "Ex.: entrega e transferência em até 10 dias" },
      { id: "garantia", label: "Garantias e vícios", placeholder: "Ex.: vendido no estado em que se encontra" },
      { id: "multa", label: "Multa por descumprimento", placeholder: "Ex.: 10% do preço" },
      FORUM,
    ],
  },
  nda: {
    summary: "Sigilo sobre informações trocadas numa negociação ou projeto.",
    roles: ["Parte Reveladora", "Parte Receptora"],
    questions: [
      { id: "finalidade", label: "Finalidade", placeholder: "Ex.: avaliar uma possível parceria comercial" },
      { id: "informacoes", label: "Informações protegidas", placeholder: "Ex.: dados financeiros, clientes e código-fonte" },
      { id: "prazo", label: "Prazo do sigilo", placeholder: "Ex.: 5 anos após o fim das tratativas" },
      { id: "multa", label: "Multa por violação", placeholder: "Ex.: R$ 100.000,00, sem prejuízo de perdas e danos" },
      FORUM,
    ],
  },
  outro: {
    summary: "Qualquer outro documento: você descreve qual.",
    roles: ["Primeira parte", "Segunda parte"],
    questions: [
      { id: "objeto", label: "Objeto", placeholder: "Ex.: cessão de uso de sala comercial para evento" },
      { id: "obrigacoes", label: "Obrigações principais", placeholder: "Ex.: a cessionária cuida da limpeza e segurança" },
      { id: "valores", label: "Valores e prazos", placeholder: "Ex.: R$ 1.500,00 pagos até a véspera" },
      FORUM,
    ],
  },
};
