# Fragments Microservice Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:22-alpine AS deps

LABEL maintainer="Avinav <avinav@myseneca.ca>"
LABEL description="Fragments node.js microservice"

WORKDIR /app

ENV NODE_ENV=production

# Copy package files explicitly (better for Docker layer caching)
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Set environment variables (one per line for clarity)
ENV NODE_ENV=production
ENV PORT=8080
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_COLOR=false

# Copy package files for reference
COPY package.json package-lock.json ./

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy only application source (exclude tests and dev files)
COPY ./src ./src

# Expose service port
EXPOSE 8080

# Run the service
CMD ["node", "src/index.js"]



















# /////////////////////////////////////////////////////
#   FROM node:22-alpine AS deps
#   WORKDIR /app
#   ENV NODE_ENV=production
#   COPY package*.json ./
#   RUN npm ci --omit=dev

# LABEL maintainer="Avinav <avinav@myseneca.ca>"
# LABEL description="Fragments node.js microservice"
  
#   # ---- runtime stage:
#     FROM node:22-alpine AS runner
#     ENV NODE_ENV=production \
#     PORT=8080 \
#     NPM_CONFIG_LOGLEVEL=warn \
#     NPM_CONFIG_COLOR=false
    
#     WORKDIR /app
    
#     # copy package 
#     COPY package*.json ./
#     COPY --from=deps /app/node_modules ./node_modules
    
#     # copy only what the app needs to run
#     COPY ./src ./src
#     COPY ./tests ./tests
    
    
    
#  # We run our service on port 8080
# EXPOSE 8080

# CMD ["node", "src/index.js"]
