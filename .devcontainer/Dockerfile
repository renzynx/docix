FROM golang:1.25.5-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    bash \
    libvips-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install air for Go hot-reload
RUN go install github.com/air-verse/air@latest

# Set up nvm environment
ENV NVM_DIR=/root/.nvm

# Copy .nvmrc first for nvm install
COPY .nvmrc /tmp/.nvmrc

# Install nvm and Node.js based on .nvmrc
# Create symlinks to make node/npm/pnpm available in PATH without sourcing nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && \
    cd /tmp && nvm install && \
    npm install -g pnpm && \
    NODE_PATH=$(dirname $(which node)) && \
    ln -sf "$NODE_PATH/node" /usr/local/bin/node && \
    ln -sf "$NODE_PATH/npm" /usr/local/bin/npm && \
    ln -sf "$NODE_PATH/npx" /usr/local/bin/npx && \
    ln -sf "$NODE_PATH/pnpm" /usr/local/bin/pnpm && \
    ln -sf "$NODE_PATH/pnpx" /usr/local/bin/pnpx

WORKDIR /app

# Copy go workspace files
COPY go.work ./
COPY go.work.sum* ./

# Copy all go.mod files for dependency caching
COPY apps/server/go.* ./apps/server/
COPY apps/worker/go.* ./apps/worker/
COPY apps/cdn/go.* ./apps/cdn/
COPY apps/cli/go.* ./apps/cli/
COPY packages/go/go.* ./packages/go/
COPY packages/go/redis/go.* ./packages/go/redis/

# Download Go dependencies
RUN cd apps/server && go mod download && \
    cd ../worker && go mod download && \
    cd ../cdn && go mod download && \
    cd ../cli && go mod download

# Copy package.json files for pnpm dependency caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install Node dependencies
RUN pnpm install --frozen-lockfile

# Create uploads directory
RUN mkdir -p /data/uploads/pending

# Default to bash shell
CMD ["bash"]
