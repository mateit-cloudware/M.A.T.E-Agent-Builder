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