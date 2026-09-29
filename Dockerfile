# Magistral production image: the Next.js standalone server with its SQLite database in /app/data.
# Build it on the machine that runs it (or with buildx --platform): sqlite-vec and onnxruntime ship
# native binaries per CPU architecture.

ARG NODE_IMAGE=node:26-bookworm-slim
# Keep in sync with "packageManager" in package.json (Node 25+ images no longer ship corepack).
ARG PNPM_VERSION=11.10.0

FROM ${NODE_IMAGE} AS deps
ARG PNPM_VERSION
WORKDIR /app
RUN npm install --global pnpm@${PNPM_VERSION}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM ${NODE_IMAGE} AS build
ARG PNPM_VERSION
WORKDIR /app
RUN npm install --global pnpm@${PNPM_VERSION}
ARG MAGISTRAL_COMMIT=""
ENV MAGISTRAL_COMMIT=${MAGISTRAL_COMMIT} \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MAGISTRAL_DATA_DIR=/app/data \
    MAGISTRAL_BACKUP_DIR=/app/backups
# curl answers the health check; tini forwards signals so the server shuts down cleanly.
RUN apt-get update \
    && apt-get install --no-install-recommends -y curl tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system magistral \
    && useradd --system --gid magistral --home-dir /app magistral \
    && mkdir -p /app/data /app/backups \
    && chown magistral:magistral /app/data /app/backups
COPY --from=build --chown=magistral:magistral /app/.next/standalone ./
COPY --from=build --chown=magistral:magistral /app/.next/static ./.next/static
COPY --from=build --chown=magistral:magistral /app/public ./public
USER magistral
VOLUME ["/app/data", "/app/backups"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail --silent --header "Host: localhost" http://localhost:3000/api/health > /dev/null || exit 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
