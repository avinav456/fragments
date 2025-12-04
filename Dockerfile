
  FROM node:22-alpine AS deps
  WORKDIR /app
  ENV NODE_ENV=production
  COPY package*.json ./
  RUN npm ci --omit=dev

LABEL maintainer="Avinav <avinav@myseneca.ca>"
LABEL description="Fragments node.js microservice"
  
  # ---- runtime stage:
    FROM node:22-alpine AS runner
    ENV NODE_ENV=production \
    PORT=8080 \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false
    
    WORKDIR /app
    
    # copy package 
    COPY package*.json ./
    COPY --from=deps /app/node_modules ./node_modules
    
    # copy only what the app needs to run
    COPY ./src ./src
    COPY ./tests ./tests
    
    
    
 # We run our service on port 8080
EXPOSE 8080

CMD ["node", "src/index.js"]
