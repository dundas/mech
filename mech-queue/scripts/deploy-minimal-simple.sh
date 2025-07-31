#!/bin/bash

# Simple deployment script without registry authentication
set -e

echo "🚀 Deploying Queue and Indexer Services to Minimal Droplet..."

# Configuration
DROPLET_IP="174.138.68.108"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Save images locally
print_status "Preparing Docker images..."
docker pull registry.digitalocean.com/queue-service-registry/queue-service:amd64-latest
docker pull registry.digitalocean.com/queue-service-registry/mech-indexer:amd64-latest

docker save registry.digitalocean.com/queue-service-registry/queue-service:amd64-latest -o queue-service.tar
docker save registry.digitalocean.com/queue-service-registry/mech-indexer:amd64-latest -o indexer-service.tar

# Transfer images to droplet
print_status "Transferring images to droplet..."
scp -o StrictHostKeyChecking=no queue-service.tar indexer-service.tar root@$DROPLET_IP:/tmp/

# Load images on droplet
print_status "Loading images on droplet..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'EOF'
    docker load -i /tmp/queue-service.tar
    docker load -i /tmp/indexer-service.tar
    rm /tmp/queue-service.tar /tmp/indexer-service.tar
EOF

# Create deployment directory
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP "mkdir -p /opt/mech-services"

# Create environment files
print_status "Creating environment configurations..."
cat > .env.services << EOF
# Queue Service Environment
QUEUE_PORT=3003
QUEUE_REDIS_HOST=queue-valkey-do-user-18731422-0.e.db.ondigitalocean.com
QUEUE_REDIS_PORT=25061
QUEUE_REDIS_PASSWORD=AVNS_QcEmwWkueKwr_A0g3m8
QUEUE_MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/queue?retryWrites=true&w=majority&appName=MAIN
QUEUE_MASTER_API_KEY=test-master-key-12345

# Indexer Service Environment
INDEXER_PORT=3005
INDEXER_REDIS_HOST=queue-valkey-do-user-18731422-0.e.db.ondigitalocean.com
INDEXER_REDIS_PORT=25061
INDEXER_REDIS_PASSWORD=AVNS_QcEmwWkueKwr_A0g3m8
INDEXER_MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/mech?retryWrites=true&w=majority&appName=MAIN
EOF

# Create simple docker-compose file
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  queue-service:
    image: registry.digitalocean.com/queue-service-registry/queue-service:amd64-latest
    container_name: queue-service
    restart: unless-stopped
    ports:
      - "3003:3003"
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - PORT=3003
      - REDIS_HOST=${QUEUE_REDIS_HOST}
      - REDIS_PORT=${QUEUE_REDIS_PORT}
      - REDIS_PASSWORD=${QUEUE_REDIS_PASSWORD}
      - REDIS_DB=0
      - MONGODB_URI=${QUEUE_MONGODB_URI}
      - MASTER_API_KEY=${QUEUE_MASTER_API_KEY}
      - ENABLE_API_KEY_AUTH=true
      - ENABLE_PROMETHEUS_METRICS=true
      - METRICS_PORT=3004
      - LOG_LEVEL=info
      - MAX_WORKERS_PER_QUEUE=3
      - RATE_LIMIT_MAX_REQUESTS=500
      - RATE_LIMIT_WINDOW_MS=60000
    deploy:
      resources:
        limits:
          memory: 400M

  indexer-service:
    image: registry.digitalocean.com/queue-service-registry/mech-indexer:amd64-latest
    container_name: indexer-service
    restart: unless-stopped
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=production
      - PORT=3005
      - REDIS_HOST=${INDEXER_REDIS_HOST}
      - REDIS_PORT=${INDEXER_REDIS_PORT}
      - REDIS_PASSWORD=${INDEXER_REDIS_PASSWORD}
      - MONGODB_URI=${INDEXER_MONGODB_URI}
      - API_KEY_HEADER=x-api-key
      - ENABLE_API_KEY_AUTH=true
      - MAX_CONCURRENT_JOBS=2
      - BATCH_SIZE=10
    deploy:
      resources:
        limits:
          memory: 400M

networks:
  default:
    driver: bridge
EOF

# Copy files to droplet
print_status "Copying configuration to droplet..."
scp -o StrictHostKeyChecking=no .env.services docker-compose.yml root@$DROPLET_IP:/opt/mech-services/

# Start services
print_status "Starting services..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'EOF'
    cd /opt/mech-services
    docker-compose --env-file .env.services up -d
    
    echo "Waiting for services to start..."
    sleep 30
    
    # Check health
    echo "Checking service health..."
    curl -f http://localhost:3003/health && echo " ✓ Queue service is healthy" || echo " ✗ Queue service not responding"
    curl -f http://localhost:3005/health && echo " ✓ Indexer service is healthy" || echo " ✗ Indexer service not responding"
EOF

# Cleanup
rm -f queue-service.tar indexer-service.tar .env.services docker-compose.yml

print_status "Deployment complete!"
echo ""
echo "📋 Deployment Summary:"
echo "  Droplet IP: $DROPLET_IP"
echo "  Queue Service: http://$DROPLET_IP:3003"
echo "  Indexer Service: http://$DROPLET_IP:3005"
echo ""
echo "🔍 Direct access endpoints:"
echo "  curl http://$DROPLET_IP:3003/health"
echo "  curl http://$DROPLET_IP:3005/health"
echo "  curl -H 'x-api-key: test-master-key-12345' http://$DROPLET_IP:3003/api/explain"
echo ""
print_warning "Remember to update DNS settings to point to the new droplet IP: $DROPLET_IP"