# Publicar o Magistral com DuckDNS (guia completo)

Este guia leva do zero a uma versão de teste no ar, com endereço `https://SEU-NOME.duckdns.org`, HTTPS
automático e a conta de administrador criada. Serve para uma demonstração: o caminho todo leva de 30 a 60
minutos, quase todo esperando a primeira construção da imagem.

**Como funciona.** Uma máquina na AWS roda dois contêineres Docker: o **app** (Magistral, com o banco SQLite
num volume) e o **Caddy**, que recebe as visitas nas portas 80 e 443, obtém sozinho o certificado HTTPS do
Let's Encrypt e repassa o tráfego ao app. O **DuckDNS** dá um nome grátis para o IP da máquina.

```
navegador ──HTTPS──▶ SEU-NOME.duckdns.org ──▶ AWS (IP público)
                                               ├─ Caddy (portas 80/443, certificado)
                                               └─ Magistral (porta 3000, só interna) ── banco no volume
```

## 0. O que você precisa antes de começar

| Item | Para quê | Custo |
| --- | --- | --- |
| Conta na AWS | a máquina (EC2) | ~US$ 15–30/mês ligada o tempo todo; desligue depois da demonstração |
| Conta no [DuckDNS](https://www.duckdns.org) | o nome `*.duckdns.org` | grátis (login com Google, GitHub etc.) |
| Chave de um provedor de IA | gerar minutas e conversar | ver abaixo |
| O código do Magistral | a máquina precisa recebê-lo | — |
| (Opcional) conta na [Jurisprudências.ai](https://jurisprudencias.ai) | pesquisa de jurisprudência | plano gratuito: 5 buscas/dia; assinatura para uso real |

**Provedor de IA.** O padrão é o OpenRouter (`OPENROUTER_API_KEY`). Os modelos gratuitos (`:free`) servem
para olhar a tela, mas ficam limitados (50 pedidos por dia e, na prática, recusas frequentes por excesso de
uso). Para uma demonstração confiável, **compre créditos no OpenRouter** (US$ 10 dão 1.000 pedidos/dia nos
modelos gratuitos e permitem modelos pagos) ou use `LLM_PROVIDER=gemini` / `anthropic` com a chave
correspondente.

**Privacidade e modo demonstração.** Por padrão o Magistral só envia texto a provedores que garantem
retenção zero (`zdr`) e não treinam com os dados; a maioria dos modelos gratuitos não tem essa garantia, e por
isso costuma falhar. Para uma demonstração rápida, ligue o **modo demonstração**
(`OPENROUTER_ALLOW_DATA_COLLECTION=true`, passo 6): os modelos gratuitos passam a responder, mas os provedores
**podem guardar e usar os textos** para treinar modelos. Nesse modo use **apenas dados fictícios**. O
Magistral avisa isso num quadro amarelo na página inicial e em Privacidade. Na versão final, desligue-o e use
um modelo/provedor pago.

## 1. Criar o nome no DuckDNS

1. Entre em <https://www.duckdns.org> e faça login.
2. Em **domains**, digite um nome (ex.: `magistral-demo`) e clique em **add domain**. Seu endereço será
   `magistral-demo.duckdns.org`.
3. Anote o **token** que aparece no topo da página (é uma chave secreta: não a publique).
4. Deixe o IP em branco por enquanto; você o preenche no passo 3.

## 2. Criar a máquina na AWS

1. No console da AWS, escolha uma região (ex.: **São Paulo, sa-east-1**) e vá em **EC2 → Launch instance**.
2. Configure:
   - **Imagem:** Ubuntu Server 24.04 LTS.
   - **Tipo:** `t3.medium` (2 vCPU, 4 GB) é o confortável; `t3.small` (2 GB) funciona para demonstração.
     Se a máquina for ARM (`t4g.*`), tudo funciona igual, mas construa a imagem nela (passo 5).
   - **Par de chaves:** crie uma (arquivo `.pem`) e guarde-a; é como você entra por SSH.
   - **Armazenamento:** 30 GB (a imagem, o modelo de busca da biblioteca e o banco ocupam alguns GB).
3. Em **Network settings → Edit**, crie um **grupo de segurança** com estas regras de entrada:

   | Tipo | Protocolo | Porta | Origem |
   | --- | --- | --- | --- |
   | SSH | TCP | 22 | **Meu IP** (não deixe aberto ao mundo) |
   | HTTP | TCP | 80 | Qualquer lugar (o Let's Encrypt usa esta porta) |
   | HTTPS | TCP | 443 | Qualquer lugar |
   | Custom UDP | UDP | 443 | Qualquer lugar (HTTP/3, opcional) |

   **Não abra a porta 3000**: só o Caddy conversa com o app.
4. Clique em **Launch instance**.
5. Vá em **EC2 → Elastic IPs → Allocate → Associate** e associe o IP à instância. Sem o Elastic IP, o IP
   público muda quando a máquina é reiniciada e o DuckDNS deixa de apontar para ela.

## 3. Apontar o DuckDNS para a máquina

1. Copie o **Elastic IP** da instância.
2. Na página do DuckDNS, cole o IP no campo **current ip** do seu domínio e clique em **update ip**.
3. Confira (no seu computador): `nslookup magistral-demo.duckdns.org` deve mostrar o IP da AWS. Se ainda
   não mostrar, espere um ou dois minutos.

Com Elastic IP o IP não muda mais, então o atualizador automático do DuckDNS é opcional (há uma opção no
passo 6).

## 4. Entrar na máquina e instalar o Docker

No seu computador (troque o caminho da chave e o IP):

```bash
chmod 400 minha-chave.pem
ssh -i minha-chave.pem ubuntu@SEU-ELASTIC-IP
```

Já na máquina:

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit    # saia e entre de novo para o grupo docker valer
```

Entre outra vez e confirme: `docker compose version` deve mostrar a versão do Compose.

**Máquina de 2 GB:** crie memória de troca para a construção da imagem não estourar a RAM.

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 5. Levar o código para a máquina

O repositório não tem um remoto configurado. Escolha um dos caminhos.

**A. Copiar a pasta (mais simples).** No seu computador, dentro da pasta do projeto:

```bash
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude data --exclude '.env*' --exclude .git \
  -e "ssh -i minha-chave.pem" ./ ubuntu@SEU-ELASTIC-IP:~/magistral/
```

**B. Por um repositório privado.** Crie um repositório privado no GitHub, faça `git remote add origin ...` e
`git push` a partir da branch `main`, e na máquina rode `git clone <url> magistral`. (Para atualizar depois,
basta `git pull`.)

Nos dois casos, o resultado é a pasta `~/magistral` na máquina.

## 6. Configurar o `.env.production`

Na máquina:

```bash
cd ~/magistral
cp .env.production.example .env.production
chmod 600 .env.production
openssl rand -base64 48        # copie o resultado: é a MAGISTRAL_SECRET_KEY
nano .env.production
```

Preencha (troque `magistral-demo` pelo seu nome):

```ini
MAGISTRAL_DOMAIN=magistral-demo.duckdns.org
MAGISTRAL_PUBLIC_URL=https://magistral-demo.duckdns.org
MAGISTRAL_RELEASE_CHANNEL=teste

MAGISTRAL_SECRET_KEY=<o valor gerado pelo openssl>
# Opcional: um código fixo para criar o primeiro administrador (senão ele aparece nos logs).
MAGISTRAL_SETUP_TOKEN=

LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...            # sua chave
# Modelos separados por vírgula, tentados em ordem. Sugestão para a demonstração (gratuitos, com chamada de
# ferramentas; o primeiro respondeu melhor nos testes, mas a disponibilidade dos gratuitos muda):
OPENROUTER_MODELS=nvidia/nemotron-3-super-120b-a12b:free,qwen/qwen3.8-27b:free,google/gemma-4-31b-it:free
# MODO DEMONSTRAÇÃO (só dados fictícios!): "true" libera provedores gratuitos que podem guardar/treinar
# com os textos. Para uso real, deixe vazio e use um modelo pago.
OPENROUTER_ALLOW_DATA_COLLECTION=true

# Só se for usar o atualizador do DuckDNS (passo 7):
DUCKDNS_SUBDOMAIN=magistral-demo        # só o nome, sem .duckdns.org
DUCKDNS_TOKEN=<token do passo 1>
```

Para usar outro provedor, mude `LLM_PROVIDER` para `gemini` (com `GEMINI_API_KEY`) ou `anthropic` (com
`ANTHROPIC_API_KEY`).

O servidor confere estas variáveis ao iniciar e **não sobe** se faltar alguma coisa importante
(`MAGISTRAL_PUBLIC_URL`, `MAGISTRAL_SECRET_KEY` com 32 caracteres ou mais, a chave do provedor). A mensagem
aparece nos logs.

> **Guarde a `MAGISTRAL_SECRET_KEY`.** Ela protege as credenciais das integrações no banco. Se mudar, a
> conexão com a Jurisprudências.ai precisará ser refeita.

## 7. Subir tudo

```bash
cd ~/magistral
docker compose --env-file .env.production up -d --build
```

Para também manter o DuckDNS atualizado sozinho (útil se você não usou Elastic IP), acrescente o perfil:

```bash
docker compose --env-file .env.production --profile duckdns up -d --build
```

A primeira construção leva de 5 a 15 minutos. Acompanhe:

```bash
docker compose ps                 # app e caddy devem estar "running" (o app, "healthy" depois de ~1 min)
docker compose logs -f app        # Ctrl+C para sair
docker compose logs caddy | tail  # deve mostrar "certificate obtained successfully"
```

Construa **sempre na própria máquina** (como acima): o Magistral usa bibliotecas com binários diferentes
para x86_64 e ARM.

## 8. Conferir que está no ar

No seu computador:

```bash
curl https://magistral-demo.duckdns.org/api/health
# {"status":"ok","version":"0.2.0",...}
```

Abra `https://magistral-demo.duckdns.org` no navegador: deve aparecer o cadeado e a tela de configuração.

## 9. Criar o administrador

1. Pegue o código de configuração:

   ```bash
   docker compose logs app | grep "código de configuração"
   ```

   (ou use o `MAGISTRAL_SETUP_TOKEN`, se definiu um).
2. Abra `https://magistral-demo.duckdns.org/configurar`, informe o código e crie a conta de administrador.
   A senha precisa ter 10 caracteres ou mais.
3. Em **Sistema → Equipe**, cadastre as outras pessoas (cada uma com a própria conta). Minutas, conversas e
   tarefas são de quem as criou; personas, cláusulas e a biblioteca são do escritório.

## 10. Roteiro sugerido para a demonstração

1. **Início:** mostre a caixa "Como posso ajudar?" e o botão **Advogado IA** (ou `Ctrl+K`) em qualquer página.
2. **Cláusulas e biblioteca:** em cada página vazia, clique em **Carregar exemplos** (dados fictícios).
   Na primeira indexação da biblioteca o servidor baixa o modelo de busca (~300 MB); leva alguns minutos.
3. **Nova minuta:** o passo a passo em tela cheia (tipo → partes → condições → persona → revisão → gerar).
   A geração roda em segundo plano; o sino avisa quando termina e a minuta abre em **Histórico**.
4. **Advogado IA com ferramentas:** peça "Quais personas temos? Crie uma cláusula de multa por atraso para
   locação". Ele consulta os dados sozinho e mostra um **cartão de confirmação** antes de criar.
   Em uma minuta do histórico, peça uma alteração e veja as mudanças marcadas antes de aceitar.
5. **Jurisprudência (opcional):** veja o passo 11.
6. **Feedback:** o botão no topo grava relatos que o administrador lê em **Sistema → Feedback**.

## 11. Conectar a Jurisprudências.ai (opcional)

1. Tenha uma conta em <https://jurisprudencias.ai> (o plano gratuito serve para testar: 5 buscas e 10
   consultas por dia, para o escritório inteiro; a assinatura libera 500 buscas/dia).
2. Como administrador, abra **Sistema → Integrações** e clique em **Conectar a conta do escritório**.
3. Você é levado à Jurisprudências.ai: entre na conta, autorize o Magistral e volte automaticamente. A tela
   mostra "Conectada" e o uso do dia.
4. No Advogado IA, peça, por exemplo: "Pesquise no STJ jurisprudência sobre fiança em contrato de locação".
   As decisões vêm citadas como [J1], [J2]… com "Fonte: Jurisprudências.ai".

Se a autorização falhar, confira que `MAGISTRAL_PUBLIC_URL` é exatamente o endereço que você abre no
navegador (com `https://` e sem barra no fim). Só o texto da pesquisa (tribunal, termos, número de processo)
é enviado; o texto das minutas não.

## Operação do dia a dia

| O quê | Como |
| --- | --- |
| Ver se está no ar | `curl https://SEU-NOME.duckdns.org/api/health` |
| Logs | `docker compose logs -f app` (uma linha JSON por erro) |
| Atualizar o código | envie a versão nova (rsync ou `git pull`) e rode `docker compose --env-file .env.production up -d --build` |
| Reiniciar | `docker compose restart` |
| Parar | `docker compose down` (os dados ficam nos volumes; **`down -v` apaga tudo**) |
| Esquecer o código de configuração | `docker compose logs app \| grep "código de configuração"` (só aparece enquanto não há usuários) |

### Cópias de segurança

Todo dia o app grava uma cópia do banco no volume `magistral_backups` (`magistral-AAAA-MM-DD.db`) e guarda as
7 mais recentes.

```bash
# listar e copiar as cópias para a máquina (e dela para fora, ex.: um bucket S3)
docker compose exec app ls /app/backups
docker compose cp app:/app/backups ./backups

# restaurar uma cópia
docker compose stop app
docker compose run --rm --no-deps --entrypoint sh app -c \
  "cp /app/backups/magistral-2026-09-28.db /app/data/magistral.db && rm -f /app/data/magistral.db-wal /app/data/magistral.db-shm"
docker compose start app
```

Para uma proteção maior, ative os snapshots do disco (EBS) da instância.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| O navegador não abre o site | DuckDNS aponta para outro IP, ou a porta 443 está fechada | `nslookup` do domínio; revise o grupo de segurança |
| Aviso de certificado inválido / Caddy sem certificado | Porta 80 fechada ou domínio ainda não aponta para a máquina | `docker compose logs caddy`; abra a 80 e espere o DNS; o Caddy tenta de novo sozinho |
| `app` reinicia sem parar | Falta variável obrigatória | `docker compose logs app` mostra o que falta |
| "Host não permitido" / 421 | `MAGISTRAL_PUBLIC_URL` diferente do endereço usado | Corrija no `.env.production` e reinicie: `docker compose up -d` |
| A IA responde "Muitas solicitações" | Modelo gratuito sobrecarregado ou cota diária acabou | Compre créditos no OpenRouter ou troque o provedor/modelo |
| A IA responde que nenhum modelo garante retenção zero | O modelo não tem rota `zdr` | Na demonstração, `OPENROUTER_ALLOW_DATA_COLLECTION=true` (dados fictícios); na versão final, um modelo/provedor pago com retenção zero |
| Construção da imagem morre por falta de memória | Máquina de 2 GB sem troca | Crie o swap do passo 4 |
| Integrações mostra "chave de segurança mudou" | `MAGISTRAL_SECRET_KEY` foi alterada | Volte a chave anterior ou conecte de novo |
| Indexar a biblioteca demora na primeira vez | Baixando o modelo de busca | Aguarde; ele fica guardado no volume |

Depois de editar o `.env.production`, aplique com `docker compose --env-file .env.production up -d`
(o arquivo só é lido quando o contêiner é recriado).

## Encerrar a demonstração

- Para apenas pausar: pare a instância no console da AWS (o Elastic IP parado cobra uma taxa pequena; libere-o
  se não for usar de novo).
- Para apagar tudo: `docker compose down -v` na máquina (apaga banco e cópias), depois **Terminate** da
  instância, **Release** do Elastic IP e, se quiser, remova o domínio no DuckDNS.
- Se o token do DuckDNS ou uma chave de IA apareceu em algum lugar indevido, gere outra.

## Referência rápida dos arquivos

- `Dockerfile` — imagem do app (Next.js em modo standalone, usuário sem privilégios, `HEALTHCHECK`).
- `docker-compose.yml` — `app`, `caddy` e o `duckdns` opcional; volumes `magistral_data` e `magistral_backups`.
- `deploy/Caddyfile` — HTTPS automático e repasse ao app (sem armazenar respostas de eventos em buffer).
- `.env.production.example` — todas as variáveis, comentadas.
