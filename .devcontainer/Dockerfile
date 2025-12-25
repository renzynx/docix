# Combined development environment for Docix
# Go + Node + pnpm + libvips for image processing
FROM golang:1.25.5-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    vips-dev \
    gcc \
    musl-dev \
    nodejs \
    npm

# Install air for Go hot-reload
RUN go install github.com/air-verse/air@latest

# Install pnpm globally
RUN npm install -g pnpm

# Enable corepack for pnpm management
RUN corepack enable

WORKDIR /app

# Copy go workspace files
COPY go.work ./
COPY go.work.sum* ./

# Copy all go.mod files for dependency caching
COPY apps/server/go.* ./apps/server/
COPY apps/worker/go.* ./apps/worker/
COPY apps/cdn/go.* ./apps/cdn/
COPY packages/go/go.* ./packages/go/
COPY packages/go/redis/go.* ./packages/go/redis/

# Download Go dependencies
RUN cd apps/server && go mod download && \
    cd ../worker && go mod download && \
    cd ../cdn && go mod download

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
