FROM golang:1.25.5-alpine AS builder

RUN apk add --no-cache git

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
RUN cd apps/server && go mod download

# Copy source code
COPY apps/server ./apps/server
COPY packages/go ./packages/go

# Build
RUN cd apps/server && CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/api

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /server .

EXPOSE 8000

CMD ["./server"]
