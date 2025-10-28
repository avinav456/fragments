# # This line specifies the parent for our image 
#   # Use node version 22.12.0
# FROM node:22.12.0

# # Labels
# LABEL maintainer="Avinav <avinav@myseneca.ca>"
# LABEL description="Fragments node.js microservice"

# # We default to use port 8080 in our service
# ENV PORT=8080

# # Reduce npm spam when installing within Docker
# # https://docs.npmjs.com/cli/v8/using-npm/config#loglevel
# ENV NPM_CONFIG_LOGLEVEL=warn

# # Disable color when run inside Docker
# # https://docs.npmjs.com/cli/v8/using-npm/config#color
# ENV NPM_CONFIG_COLOR=false

# # Use /app as our working directory
# WORKDIR /app

# # Option 1: explicit path - Copy the package.json and package-lock.json
# # files into /app. NOTE: the trailing `/` on `/app/`, which tells Docker
# # that `app` is a directory and not a file.
# COPY package*.json /app/

# # Install node dependencies defined in package-lock.json
# RUN npm install

# # Copy src to /app/src/
# COPY ./src ./src

# # Copy our HTPASSWD file
# COPY ./tests/.htpasswd ./tests/.htpasswd

# # Start the container by running our server
# CMD npm start

# # We run our service on port 8080
# EXPOSE 8080

#Below is the update docker file code for lab6

# ---- deps stage: install prod deps only ----
  FROM node:22-alpine AS deps
  WORKDIR /app
  ENV NODE_ENV=production
  COPY package*.json ./
  RUN npm ci --omit=dev
  
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
    
    USER node
    
 # We run our service on port 8080
EXPOSE 8080

CMD ["node", "src/index.js"]
