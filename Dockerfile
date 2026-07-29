# Baut ein eigenständiges Abbild der App.
#
#   docker build -t westernhengste .
#   docker run -p 3000:3000 \
#     -e ADMIN_PASSWORD=... -e SESSION_SECRET=... \
#     -v westernhengste-data:/data \
#     westernhengste
#
# Wichtig: /data muss ein dauerhaftes Volume sein - dort liegt die Datenbank.

FROM node:22-slim AS deps
WORKDIR /app
# better-sqlite3 braucht ggf. Build-Werkzeuge, falls kein fertiges Binary passt.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Der Build darf die Datenbank nicht anlegen oder befüllen.
ENV SKIP_AUTO_SEED=1
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/data/westernhengste.db
ENV PORT=3000

RUN useradd --system --uid 1001 nextjs \
 && mkdir -p /data && chown nextjs:nextjs /data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Das native Modul wird nicht mitgebündelt und muss daneben liegen.
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

USER nextjs
VOLUME ["/data"]
EXPOSE 3000

CMD ["node", "server.js"]
