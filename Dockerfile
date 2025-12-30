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
        chromium \
        curl && \
    npm install -g pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src/flowise

# Copy app source
COPY . .

# Install dependencies and build
RUN pnpm install && \
    pnpm build && \
    pnpm prune --prod

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