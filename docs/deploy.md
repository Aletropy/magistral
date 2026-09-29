# Publicar o Magistral (versão de teste)

O Magistral roda num contêiner Docker atrás do [Caddy](https://caddyserver.com), que obtém e renova o
certificado HTTPS sozinho. Este guia usa uma máquina na AWS com um domínio do DuckDNS.

## 1. Preparar a máquina

1. Crie a instância (Ubuntu ou Debian, 2 GB de RAM ou mais) e instale o Docker com o plugin Compose.
2. No **grupo de segurança** da instância, libere a entrada nas portas **80** e **443** (TCP) e **443**
   (UDP). A porta 3000 **não** precisa ficar aberta: só o Caddy fala com o app.
3. No [DuckDNS](https://www.duckdns.org), crie o subdomínio (ex.: `magistral`) apontando para o IP público
   da instância. Se o IP puder mudar, use o atualizador opcional (passo 3).

## 2. Configurar

```bash
git clone <repositório> magistral && cd magistral
cp .env.production.example .env.production
openssl rand -base64 48   # cole o resultado em MAGISTRAL_SECRET_KEY
```

Preencha no `.env.production`:

- `MAGISTRAL_DOMAIN` e `MAGISTRAL_PUBLIC_URL` com o endereço do DuckDNS;
- `MAGISTRAL_SECRET_KEY`;
- a chave do provedor de IA (`OPENROUTER_API_KEY` ou outra). O plano gratuito do OpenRouter permite só
  50 pedidos por dia; para vários testadores, compre créditos ou use um modelo pago.

O servidor confere essas variáveis ao iniciar e **não sobe** se faltar alguma; a mensagem aparece nos logs.

## 3. Subir

```bash
docker compose --env-file .env.production up -d --build
# com o atualizador do DuckDNS:
docker compose --env-file .env.production --profile duckdns up -d --build
```

A primeira construção leva alguns minutos. Construa sempre **na própria máquina** (ou com
`docker buildx build --platform` da arquitetura dela): algumas bibliotecas trazem binários diferentes para
x86_64 e ARM (instâncias Graviton).

## 4. Primeiro acesso

```bash
docker compose logs app | grep "código de configuração"
```

Abra `https://<seu domínio>`, você será levado a `/configurar`. Use o código para criar a conta de
administrador e, em **Equipe**, cadastre os testadores.

## Operação

| O quê | Como |
| --- | --- |
| Ver se está no ar | `curl https://<domínio>/api/health` → `{"status":"ok",...}` |
| Logs | `docker compose logs -f app` (uma linha JSON por erro) |
| Atualizar | `git pull && docker compose --env-file .env.production up -d --build` |
| Parar | `docker compose down` (os dados ficam no volume `magistral_data`; `down -v` apaga tudo) |

### Cópias de segurança

Todo dia o app grava uma cópia do banco no volume `magistral_backups` (`magistral-AAAA-MM-DD.db`) e
guarda as 7 mais recentes.

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

### Feedback dos testadores

O botão de feedback no topo de cada página grava o relato com a página em que a pessoa estava.
Administradores leem e marcam como resolvidos em **Sistema → Feedback**.
