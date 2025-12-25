FROM golang:1.24-alpine AS builder

# Install build dependencies for bimg/libvips
RUN apk add --no-cache git vips-dev gcc musl-dev

WORKDIR /app

# Copy go.work and all module files first for better caching
COPY go.work ./
COPY go.work.sum* ./
COPY apps/server/go.* ./apps/server/
COPY apps/worker/go.* ./apps/worker/
COPY apps/cdn/go.* ./apps/cdn/
COPY packages/go/go.* ./packages/go/
COPY packages/go/redis/go.* ./packages/go/redis/

# Download dependencies
RUN cd apps/worker && go mod download

# Copy source code
COPY apps/worker ./apps/worker
COPY packages/go ./packages/go

# Build
RUN cd apps/worker && CGO_ENABLED=1 GOOS=linux go build -o /worker ./cmd

# Runtime stage
FROM alpine:3.19

# Install runtime dependencies for libvips
RUN apk add --no-cache ca-certificates tzdata vips

WORKDIR /app

COPY --from=builder /worker .

# Create uploads directory
RUN mkdir -p /data/uploads/pending

CMD ["./worker"]
