import type { ClauseInput } from "@/lib/clauses/schema";

/** Sample approved clauses for demos; loaded only when the user asks. */
export const DEMO_CLAUSES: readonly ClauseInput[] = [
  {
    title: "Foro",
    category: "Disposições finais",
    documentTypes: [],
    body: "Fica eleito o foro da Comarca de Exemplo para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.",
  },
  {
    title: "Multa por atraso no pagamento",
    category: "Penalidades",
    documentTypes: ["prestacao-servicos", "locacao", "compra-venda"],
    body: "O atraso no pagamento de qualquer valor devido sujeita a parte devedora a multa de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês e correção monetária pelo IPCA, calculados desde o vencimento até o efetivo pagamento.",
  },
  {
    title: "Confidencialidade",
    category: "Obrigações",
    documentTypes: ["nda", "prestacao-servicos"],
    body: "As partes manterão em sigilo todas as **Informações Confidenciais** recebidas em razão deste instrumento, durante sua vigência e por 5 (cinco) anos após o seu término, respondendo pelas perdas e danos decorrentes de qualquer divulgação não autorizada.",
  },
  {
    title: "Reajuste anual pelo IPCA",
    category: "Preço",
    documentTypes: ["prestacao-servicos", "locacao"],
    body: "Os valores deste instrumento serão reajustados a cada 12 (doze) meses, contados da data de assinatura, pela variação acumulada do IPCA/IBGE no período ou, na sua extinção, pelo índice oficial que o substituir.",
  },
];
