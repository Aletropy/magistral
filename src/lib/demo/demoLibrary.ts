import type { LibraryText } from "@/lib/rag/prepareSource";

/**
 * Two short, fictitious norms of an imaginary municipality, written in the shape of real legislation so
 * article-level retrieval can be demonstrated. They are not real law and say so in their titles.
 */
export const DEMO_LIBRARY: readonly LibraryText[] = [
  {
    title: "Lei Complementar nº 1-2020 do Município de Exemplo (fictícia)",
    kind: "lei",
    fileName: "exemplo-lei-complementar-1-2020.txt",
    text: `LEI COMPLEMENTAR Nº 1, DE 10 DE MARÇO DE 2020 (TEXTO FICTÍCIO PARA DEMONSTRAÇÃO)

Dispõe sobre o Imposto sobre a Propriedade Predial e Territorial Urbana no Município de Exemplo.

TÍTULO I

DO IMPOSTO SOBRE A PROPRIEDADE PREDIAL E TERRITORIAL URBANA

CAPÍTULO I

DA INCIDÊNCIA E DOS CONTRIBUINTES

Art. 1º O Imposto sobre a Propriedade Predial e Territorial Urbana tem como fato gerador a propriedade, o domínio útil ou a posse de bem imóvel localizado na zona urbana do Município.

Art. 2º Contribuinte do imposto é o proprietário do imóvel, o titular do seu domínio útil ou o seu possuidor a qualquer título.
§ 1º Considera-se possuidor, para os fins deste artigo, o cessionário de imóvel pertencente ao Poder Público que o explore economicamente.
§ 2º A imunidade do ente público cedente não se estende ao cessionário.

CAPÍTULO II

DAS PENALIDADES

Art. 3º O atraso no pagamento do imposto sujeita o contribuinte a multa moratória de 0,33% (trinta e três centésimos por cento) por dia de atraso, limitada a 20% (vinte por cento).

Art. 4º Os débitos vencidos serão atualizados monetariamente e acrescidos de juros de 1% (um por cento) ao mês.`,
  },
  {
    title: "Decreto nº 100-2021 do Município de Exemplo (fictício)",
    kind: "decreto",
    fileName: "exemplo-decreto-100-2021.txt",
    text: `DECRETO Nº 100, DE 15 DE JUNHO DE 2021 (TEXTO FICTÍCIO PARA DEMONSTRAÇÃO)

Regulamenta a cessão de uso de imóveis municipais a particulares.

Art. 1º A cessão de uso de imóvel do Município a particular será formalizada por termo de cessão de uso, precedido de autorização do Prefeito.

Art. 2º O termo de cessão de uso conterá, obrigatoriamente:
I – a identificação do imóvel e sua destinação;
II – o prazo da cessão, não superior a 10 (dez) anos;
III – a responsabilidade do cessionário pelo pagamento dos tributos incidentes sobre o imóvel, inclusive o IPTU;
IV – as hipóteses de revogação.

Art. 3º A cessão poderá ser revogada a qualquer tempo, por interesse público, mediante notificação com antecedência mínima de 60 (sessenta) dias.`,
  },
];
