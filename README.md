# Magistral — Minuta com Personalidade

Gera minutas jurídicas (contratos, NDAs, notificações, pareceres) no tom de voz escolhido e as entrega prontas para revisar e baixar em Word ou PDF. Tudo roda na sua máquina: o banco de dados, a biblioteca de leis e o modelo de busca ficam na pasta `data/`. Só a redação usa uma IA na nuvem.

## O que dá para fazer

- **Nova minuta**: passo a passo ou todos os campos numa página; tipo de documento, partes, cláusulas específicas e uma *persona* (o tom de voz). A minuta sai em Markdown, é salva no **Histórico** e pode ser baixada em `.docx` ou `.pdf`.
- **Personas**: crie e ajuste o tom (instrução, regras, termos proibidos, formalidade, agressividade, extensão, criatividade). Em **Testar persona**, compare um texto de amostra com a versão reescrita antes de salvar.
- **Capturar estilo**: envie um PDF ou DOCX de que você gosta e a IA extrai o estilo dele para uma nova persona.
- **Biblioteca jurídica**: leis, decretos e pareceres do Município, divididos por artigo. Com "Fundamentar com a biblioteca", a minuta cita só normas da biblioteca e marca `[PREENCHER: fundamento legal]` quando falta uma.
- **Cláusulas aprovadas**: textos pré-aprovados que você escolhe e ordena (arrastando) para montar a minuta; a IA só ajusta o tom.
- **Revisar alterações**: veja palavra por palavra o que a IA mudou em cada cláusula aprovada (ou em relação a um texto original) e aceite ou rejeite cada mudança.
- **Lotes**: uma minuta por linha de uma planilha CSV/XLSX (ex.: notificações de débito), geradas em segundo plano e baixadas num ZIP.
- **Uso** (administradores): cada chamada à IA com tokens, tempo, custo estimado e quem a fez.
- **Equipe** (administradores): quem pode entrar. Minutas, conversas, lotes e tarefas são de cada pessoa; personas, cláusulas e a biblioteca são do escritório.

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
| `OPENROUTER_ALLOW_DATA_COLLECTION` | Opcional. `true` libera provedores que podem guardar os textos (veja Privacidade). |
| `MAGISTRAL_DATA_DIR` | Pasta dos dados (padrão `./data`). |
| `MAGISTRAL_ALLOWED_HOSTS` | Nomes pelos quais o escritório acessa o servidor, além de `localhost` e endereços IP (ex.: `magistral.escritorio`). |
| `MAGISTRAL_DEV_ORIGINS` | Só em `pnpm dev`: endereços usados por outros aparelhos (ex.: `192.168.1.6`). |
| `MAGISTRAL_SETUP_TOKEN` | Opcional. Fixa o código de configuração do primeiro acesso (senão ele é sorteado e impresso no terminal). |

**Privacidade**

- Por padrão, o app só envia textos ao OpenRouter para provedores **sem retenção de dados** (ZDR): nada é guardado nem usado para treinar modelos. Todo modelo em `OPENROUTER_MODELS` precisa ter um endpoint ZDR (lista em [openrouter.ai/api/v1/endpoints/zdr](https://openrouter.ai/api/v1/endpoints/zdr)); os demais são ignorados, e se nenhum servir o app avisa. Hoje o único gratuito é `qwen/qwen3.8-27b:free`, o padrão.
- `OPENROUTER_ALLOW_DATA_COLLECTION=true` libera os outros provedores gratuitos, que **podem guardar e usar os textos enviados** (inclusive CPFs e nomes). A página **Uso** mostra qual política está valendo.
- Com `LLM_PROVIDER=gemini` e uma chave do plano gratuito, o Google pode usar os textos; use uma chave com faturamento ativo.

**Limites dos modelos gratuitos do OpenRouter**

- São **50 pedidos por dia** (1.000 depois de comprar US$ 10 em créditos) e 20 por minuto. Quando a cota acaba, o app avisa que a cota diária gratuita terminou. Cada pessoa pode ter até 5 tarefas de IA na fila ao mesmo tempo.
- Respondem em dezenas de segundos até alguns minutos. Se um modelo falha, o próximo da lista é tentado automaticamente.

## Rodando

```bash
pnpm dev          # desenvolvimento em http://localhost:3000
pnpm build && pnpm start   # produção local
```

### Primeiro acesso e equipe

1. Ao iniciar sem nenhum usuário, o servidor imprime no terminal um **código de configuração**.
2. Abra o app: ele leva a **/configurar**, onde você cria a conta de administrador com esse código. Minutas e conversas criadas antes disso passam a ser dela.
3. Em **Equipe**, o administrador cadastra as outras pessoas e informa a senha inicial; cada uma pode trocá-la em **Minha conta**.

Para acessar de outros computadores do escritório, rode `pnpm build && pnpm start` e use o endereço IP da máquina (ex.: `http://192.168.1.6:3000`) ou um nome listado em `MAGISTRAL_ALLOWED_HOSTS`. A sessão dura 12 horas sem uso; cinco senhas erradas seguidas bloqueiam a conta por 15 minutos.

Na primeira indexação da biblioteca, o modelo de busca (EmbeddingGemma, cerca de 190 MB) é baixado para `data/models`. Depois disso, a busca funciona sem internet.

Outros comandos: `pnpm test` (testes), `pnpm lint`, `pnpm typecheck`.

## Roteiro de demonstração (5 minutos)

1. **Cláusulas** → "Carregar exemplos". **Biblioteca** → "Carregar exemplos": uma lei e um decreto fictícios do "Município de Exemplo".
2. **Nova minuta**: tipo "Outro" → "Termo de Cessão de Uso de Imóvel Municipal". Partes "Município de Exemplo" (Cedente) e "Café Exemplo Ltda." (Cessionária). Adicione as cláusulas "Foro" e "Multa por atraso no pagamento", marque "Fundamentar com a biblioteca" e gere.
3. Quando a minuta fica pronta, ela abre na página de revisão. No painel ao lado, veja as **Fontes consultadas**: a minuta cita os artigos da lei e do decreto de exemplo. Em **Revisar alterações**, rejeite uma mudança numa cláusula aprovada e aplique. Baixe em Word e PDF.
4. **Histórico**: a minuta está lá, já com a revisão; busque pelo título ou filtre pela persona.
5. **Personas** → "Testar" numa persona: mova o controle de formalidade e compare o texto reescrito.
6. **Personas** → "Capturar estilo de documento": envie um parecer em PDF ou DOCX e crie uma persona com o estilo dele.
7. **Lotes** → "Novo lote": baixe a planilha de exemplo, envie-a, use `{{nome}}`, `{{cpf}}` e `{{valor}}` no modelo e inicie. As minutas ficam prontas em segundo plano; baixe o ZIP.
8. **Uso**: todas as chamadas, com os modelos usados e custo zero nos modelos gratuitos e locais.

## Onde ficam os dados

Tudo em `data/` (só a conta que roda o servidor consegue ler o banco), que não vai para o git:
- `data/magistral.db`: contas, personas, cláusulas, histórico, lotes, biblioteca e uso;
- `data/biblioteca/`: a pasta que "Sincronizar pasta" espelha;
- `data/models/`: o modelo de busca baixado.

Apague a pasta para recomeçar do zero.
