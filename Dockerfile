# -----------------------------
# Dependencies Stage
# -----------------------------
FROM node:22-alpine AS deps
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

LABEL maintainer="Avinav <avinav@myseneca.ca>"
LABEL description="Fragments node.js microservice"

# -----------------------------
# Runtime Stage
# -----------------------------
FROM node:22-alpine AS runner

ENV NODE_ENV=production \
    PORT=8080 \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false

WORKDIR /app

# Copy package metadata and node_modules from deps stage
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY ./src ./src
COPY ./tests ./tests

# Expose service port
EXPOSE 8080

# Start the service
CMD ["node", "src/index.js"]
