# Magistral — Minuta com Personalidade

Gera minutas jurídicas (contratos, NDAs, notificações, pareceres) no tom de voz escolhido e as entrega prontas para revisar e baixar em Word ou PDF. Tudo roda na sua máquina: o banco de dados, a biblioteca de leis e o modelo de busca ficam na pasta `data/`. Só a redação usa uma IA na nuvem.

## O que dá para fazer

- **Gerar minuta**: tipo de documento, partes, cláusulas específicas e uma *persona* (o tom de voz). A minuta sai em Markdown, é salva no **Histórico** e pode ser baixada em `.docx` ou `.pdf`.
- **Personas**: crie e ajuste o tom (instrução, regras, termos proibidos, formalidade, agressividade, extensão, criatividade). Em **Testar persona**, compare um texto de amostra com a versão reescrita antes de salvar.
- **Capturar estilo**: envie um PDF ou DOCX de que você gosta e a IA extrai o estilo dele para uma nova persona.
- **Biblioteca jurídica**: leis, decretos e pareceres do Município, divididos por artigo. Com "Fundamentar com a biblioteca", a minuta cita só normas da biblioteca e marca `[PREENCHER: fundamento legal]` quando falta uma.
- **Cláusulas aprovadas**: textos pré-aprovados que você escolhe e ordena (arrastando) para montar a minuta; a IA só ajusta o tom.
- **Revisar alterações**: veja palavra por palavra o que a IA mudou em cada cláusula aprovada (ou em relação a um texto original) e aceite ou rejeite cada mudança.
- **Lotes**: uma minuta por linha de uma planilha CSV/XLSX (ex.: notificações de débito), geradas em segundo plano e baixadas num ZIP.
- **Uso**: cada chamada à IA com tokens, tempo e custo estimado.

## Requisitos

- **Node.js 26** (usa o SQLite embutido do Node e o ONNX Runtime para o modelo de busca local).
- **pnpm 11** (`corepack enable` ativa a versão do projeto).

## Instalação

```bash
pnpm install
cp .env.example .env.local
```

O pnpm avisa que o script de instalação do `onnxruntime-node` foi ignorado: é esperado. Esse script só baixa binários de GPU (CUDA); o binário de CPU já vem no pacote.

### Chaves (`.env.local`)

| Variável | Para quê |
| --- | --- |
| `OPENROUTER_API_KEY` | **Obrigatória.** Crie em [openrouter.ai/keys](https://openrouter.ai/keys). O app usa modelos gratuitos (`:free`). |
| `OPENROUTER_MODELS` | Opcional. Lista de modelos separados por vírgula, tentados em ordem. Os gratuitos mudam com frequência; veja os atuais em [openrouter.ai/models?q=free](https://openrouter.ai/models?q=free). |
| `LLM_PROVIDER` | `openrouter` (padrão), `gemini` ou `anthropic`. |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Só se escolher esses provedores. |
| `EMBEDDING_PROVIDER` | Busca da biblioteca: `local` (padrão, roda na CPU, sem chave) ou `gemini`. |
| `MAGISTRAL_DATA_DIR` | Pasta dos dados (padrão `./data`). |

**Limites e privacidade dos modelos gratuitos do OpenRouter**

- São **50 pedidos por dia** (1.000 depois de comprar US$ 10 em créditos) e 20 por minuto. Quando a cota acaba, o app avisa que a cota diária gratuita terminou.
- Respondem em dezenas de segundos até alguns minutos. Se um modelo falha, o próximo da lista é tentado automaticamente.
- Nas configurações de privacidade do OpenRouter, permita os provedores gratuitos, ou os pedidos serão recusados.
- **Provedores gratuitos podem guardar e usar os textos enviados.** Em demonstrações, use dados fictícios; não envie CPFs, endereços ou nomes reais.

## Rodando

```bash
pnpm dev          # desenvolvimento em http://localhost:3000
pnpm build && pnpm start   # produção local
```

Na primeira indexação da biblioteca, o modelo de busca (EmbeddingGemma, cerca de 190 MB) é baixado para `data/models`. Depois disso, a busca funciona sem internet.

Outros comandos: `pnpm test` (testes), `pnpm lint`, `pnpm typecheck`.

## Roteiro de demonstração (5 minutos)

1. **Cláusulas** → "Carregar exemplos". **Biblioteca** → "Carregar exemplos": uma lei e um decreto fictícios do "Município de Exemplo".
2. **Gerar minuta**: tipo "Outro" → "Termo de Cessão de Uso de Imóvel Municipal". Partes "Município de Exemplo" (Cedente) e "Café Exemplo Ltda." (Cessionária). Adicione as cláusulas "Foro" e "Multa por atraso no pagamento", marque "Fundamentar com a biblioteca" e gere.
3. Veja as **Fontes consultadas**: a minuta cita os artigos da lei e do decreto de exemplo. Em **Revisar alterações**, rejeite uma mudança numa cláusula aprovada e aplique. Baixe em Word e PDF.
4. **Histórico**: a minuta está lá, já com a revisão.
5. **Personas** → "Testar" numa persona: mova o controle de formalidade e compare o texto reescrito.
6. **Personas** → "Capturar estilo de documento": envie um parecer em PDF ou DOCX e crie uma persona com o estilo dele.
7. **Lotes** → "Novo lote": baixe a planilha de exemplo, envie-a, use `{{nome}}`, `{{cpf}}` e `{{valor}}` no modelo e inicie. As minutas ficam prontas em segundo plano; baixe o ZIP.
8. **Uso**: todas as chamadas, com os modelos usados e custo zero nos modelos gratuitos e locais.

## Onde ficam os dados

Tudo em `data/`, que não vai para o git:
- `data/magistral.db`: personas, cláusulas, histórico, lotes, biblioteca e uso;
- `data/biblioteca/`: a pasta que "Sincronizar pasta" espelha;
- `data/models/`: o modelo de busca baixado.

Apague a pasta para recomeçar do zero.
