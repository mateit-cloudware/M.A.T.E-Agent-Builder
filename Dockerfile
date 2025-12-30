# M.A.T.E. Agent Builder Docker Image
FROM node:20-alpine AS builder

# Install system dependencies and build tools
# Including sqlite-dev for sqlite3 and openblas/cmake for faiss-node
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
        git \
        sqlite-dev \
        openblas-dev \
        cmake \
        lapack-dev && \
    npm install -g pnpm@9

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_OPTIONS="--max-old-space-size=8192"

WORKDIR /usr/src/flowise

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/api-documentation/package.json ./packages/api-documentation/
COPY packages/components/package.json ./packages/components/
COPY packages/server/package.json ./packages/server/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --shamefully-hoist

COPY . .

RUN pnpm build

RUN pnpm prune --prod

FROM node:20-alpine AS production

RUN apk add --no-cache libc6-compat chromium curl && \
    npm install -g pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

WORKDIR /usr/src/flowise

COPY --from=builder /usr/src/flowise .

RUN chown -R node:node .

USER node

EXPOSE 3000

CMD [ "pnpm", "start" ]
