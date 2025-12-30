# M.A.T.E. Agent Builder Docker Image
# Build: docker build --no-cache -t mate-agent-builder .
# Run: docker run -d -p 3000:3000 mate-agent-builder

FROM node:20-alpine AS builder

# Install system dependencies and build tools
RUN apk update && \
    apk add --no-cache \
        libc6-compat \
        python3 \
        make \
        g++ \
        build-base \
        cairo-dev \
        pango-dev \
        giflib-dev \
        libjpeg-turbo-dev \
        chromium \
        curl \
        git && \
    npm install -g pnpm@9

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Increase memory for Node.js build process
ENV NODE_OPTIONS="--max-old-space-size=8192"

WORKDIR /usr/src/flowise

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/api-documentation/package.json ./packages/api-documentation/
COPY packages/components/package.json ./packages/components/
COPY packages/server/package.json ./packages/server/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY . .

# Build with verbose output
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache libc6-compat chromium curl && \
    npm install -g pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

WORKDIR /usr/src/flowise

# Copy built artifacts
COPY --from=builder /usr/src/flowise .

# Give the node user ownership of the application files
RUN chown -R node:node .

# Switch to non-root user (node user already exists in node:20-alpine)
USER node

EXPOSE 3000

CMD [ "pnpm", "start" ]