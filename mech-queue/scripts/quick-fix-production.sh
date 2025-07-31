#!/bin/bash

# Quick fix script to run on the Digital Ocean droplet
# This fixes the Redis connection issue by using Valkey credentials

echo "🔧 Quick fix for queue.mech.is deployment..."

# Get Valkey connection details from DigitalOcean
echo "Getting Valkey database credentials..."
DB_INFO=$(doctl databases list --format Name,ID --no-header | grep "queue-valkey" || true)

if [ -z "$DB_INFO" ]; then
    echo "❌ Valkey database 'queue-valkey' not found!"
    echo "Please ensure you're logged into doctl with: doctl auth init"
    exit 1
fi

DB_ID=$(echo $DB_INFO | awk '{print $2}')
VALKEY_HOST=$(doctl databases connection $DB_ID --format Host --no-header)
VALKEY_PORT=$(doctl databases connection $DB_ID --format Port --no-header)
VALKEY_PASSWORD=$(doctl databases connection $DB_ID --format Password --no-header)

echo "✅ Retrieved Valkey credentials"
echo "  Host: $VALKEY_HOST"
echo "  Port: $VALKEY_PORT"

# Check current container status
echo ""
echo "Current container status:"
docker ps -a | grep queue-service || echo "No queue-service container found"

# Stop existing container
echo ""
echo "Stopping existing container..."
docker stop queue-service 2>/dev/null || true
docker rm queue-service 2>/dev/null || true

# Get the latest image name from existing containers or use default
IMAGE_NAME=$(docker ps -a --format "table {{.Image}}" | grep queue-service || echo "registry.digitalocean.com/queue-service-registry/queue-service:latest")

# Run with correct environment variables
echo ""
echo "Starting container with correct Valkey configuration..."
docker run -d \
    --name queue-service \
    --restart unless-stopped \
    -p 3003:3003 \
    -p 3004:3004 \
    -e NODE_ENV=production \
    -e PORT=3003 \
    -e REDIS_HOST="$VALKEY_HOST" \
    -e REDIS_PORT="$VALKEY_PORT" \
    -e REDIS_PASSWORD="$VALKEY_PASSWORD" \
    -e REDIS_DB=0 \
    -e MONGODB_URI="mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/queue?retryWrites=true&w=majority&appName=MAIN" \
    -e MASTER_API_KEY="${MASTER_API_KEY:-test-master-key-12345}" \
    -e ENABLE_API_KEY_AUTH=true \
    -e ENABLE_PROMETHEUS_METRICS=true \
    -e METRICS_PORT=3004 \
    -e LOG_LEVEL=info \
    -e MAX_WORKERS_PER_QUEUE=10 \
    -e RATE_LIMIT_MAX_REQUESTS=1000 \
    -e RATE_LIMIT_WINDOW_MS=60000 \
    registry.digitalocean.com/queue-service-registry/queue-service:latest

# Wait for container to start
echo ""
echo "Waiting for service to start..."
sleep 10

# Check container logs
echo ""
echo "Recent container logs:"
docker logs --tail 20 queue-service

# Test the service
echo ""
echo "Testing service health..."
if curl -f http://localhost:3003/health; then
    echo ""
    echo "✅ Service is healthy and running!"
    echo ""
    echo "Test with:"
    echo "  curl https://queue.mech.is/health"
    echo "  curl -H 'x-api-key: ${MASTER_API_KEY:-test-master-key-12345}' https://queue.mech.is/api/queues"
else
    echo ""
    echo "❌ Service health check failed!"
    echo "Check full logs with: docker logs queue-service"
fi

# Show container status
echo ""
echo "Container status:"
docker ps | grep queue-service