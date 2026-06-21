# =============================================================================
# Stage 1: build — instala dependências de produção
# =============================================================================
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

# =============================================================================
# Stage 2: production — imagem final mínima
# =============================================================================
FROM node:18-alpine AS production

WORKDIR /app

# Copia apenas o necessário do stage de build
COPY --from=build /app/node_modules ./node_modules

# Copia o código fonte
COPY src/ ./src/
COPY package.json ./

# Usa o usuário não-root já existente na imagem node:alpine
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/index.js"]
