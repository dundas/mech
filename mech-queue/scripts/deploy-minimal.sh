#!/bin/bash

# Minimal Droplet Deployment Script for Queue and Indexer Services
set -e

echo "🚀 Deploying Queue and Indexer Services to Minimal Droplet..."

# Configuration
DROPLET_IP="174.138.68.108"
REGISTRY_NAME="queue-service-registry"

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

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Create deployment directory structure on droplet
print_status "Setting up deployment structure..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'EOF'
    mkdir -p /opt/mech-services/{queue,indexer}
    
    # Install docker-compose
    if ! command -v docker-compose &> /dev/null; then
        curl -L "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    fi
    
    # Setup firewall
    ufw allow 22
    ufw allow 80
    ufw allow 443
    ufw allow 3003  # Queue service
    ufw allow 3004  # Queue metrics
    ufw allow 3005  # Indexer service
    ufw --force enable
EOF

# Create environment files
print_status "Creating environment configurations..."
cat > .env.queue << EOF
# Queue Service Environment
NODE_ENV=production
PORT=3003

# Redis/Valkey Configuration
REDIS_HOST=queue-valkey-do-user-18731422-0.e.db.ondigitalocean.com
REDIS_PORT=25061
REDIS_PASSWORD=AVNS_QcEmwWkueKwr_A0g3m8
REDIS_DB=0

# MongoDB Configuration
MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/queue?retryWrites=true&w=majority&appName=MAIN

# Security
MASTER_API_KEY=test-master-key-12345
ENABLE_API_KEY_AUTH=true

# Monitoring
ENABLE_PROMETHEUS_METRICS=true
METRICS_PORT=3004
LOG_LEVEL=info

# Performance (reduced for minimal droplet)
MAX_WORKERS_PER_QUEUE=3
RATE_LIMIT_MAX_REQUESTS=500
RATE_LIMIT_WINDOW_MS=60000
EOF

cat > .env.indexer << EOF
# Indexer Service Environment
NODE_ENV=production
PORT=3005

# Redis Configuration
REDIS_HOST=queue-valkey-do-user-18731422-0.e.db.ondigitalocean.com
REDIS_PORT=25061
REDIS_PASSWORD=AVNS_QcEmwWkueKwr_A0g3m8

# MongoDB Configuration
MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/mech?retryWrites=true&w=majority&appName=MAIN

# OpenAI Configuration (if needed)
# OPENAI_API_KEY=

# Security
API_KEY_HEADER=x-api-key
ENABLE_API_KEY_AUTH=true

# Performance (reduced for minimal droplet)
MAX_CONCURRENT_JOBS=2
BATCH_SIZE=10
EOF

# Create docker-compose.yml
print_status "Creating docker-compose configuration..."
cat > docker-compose.minimal.yml << 'EOF'
version: '3.8'

services:
  queue-service:
    image: registry.digitalocean.com/queue-service-registry/queue-service:amd64-latest
    container_name: queue-service
    restart: unless-stopped
    ports:
      - "3003:3003"
      - "3004:3004"
    env_file:
      - .env.queue
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 384M
        reservations:
          memory: 256M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  indexer-service:
    image: registry.digitalocean.com/queue-service-registry/mech-indexer:amd64-latest
    container_name: indexer-service
    restart: unless-stopped
    ports:
      - "3005:3005"
    env_file:
      - .env.indexer
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3005/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 384M
        reservations:
          memory: 256M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Nginx reverse proxy for both services
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - queue-service
      - indexer-service
    deploy:
      resources:
        limits:
          memory: 64M
        reservations:
          memory: 32M

networks:
  default:
    driver: bridge
EOF

# Create nginx configuration
print_status "Creating nginx configuration..."
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream queue_backend {
        server queue-service:3003;
    }

    upstream indexer_backend {
        server indexer-service:3005;
    }

    server {
        listen 80;
        server_name _;

        # Queue service routes
        location /queue/ {
            proxy_pass http://queue_backend/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Indexer service routes
        location /indexer/ {
            proxy_pass http://indexer_backend/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check endpoint
        location /health {
            return 200 '{"status":"healthy","services":["queue","indexer"]}';
            add_header Content-Type application/json;
        }
    }
}
EOF

# Copy files to droplet
print_status "Copying files to droplet..."
scp -o StrictHostKeyChecking=no .env.queue .env.indexer docker-compose.minimal.yml nginx.conf root@$DROPLET_IP:/opt/mech-services/

# Login to registry and deploy
print_status "Deploying services..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << EOF
    cd /opt/mech-services
    
    # Login to DigitalOcean registry
    doctl registry login
    
    # Pull latest images
    docker pull registry.digitalocean.com/queue-service-registry/queue-service:amd64-latest
    docker pull registry.digitalocean.com/queue-service-registry/mech-indexer:amd64-latest
    
    # Start services
    docker-compose -f docker-compose.minimal.yml up -d
    
    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 30
    
    # Check health
    echo "Checking service health..."
    curl -f http://localhost/queue/health || echo "Queue service not responding"
    curl -f http://localhost/indexer/health || echo "Indexer service not responding"
EOF

# Cleanup local files
rm -f .env.queue .env.indexer docker-compose.minimal.yml nginx.conf

print_status "Deployment complete!"
echo ""
echo "📋 Deployment Summary:"
echo "  Droplet IP: $DROPLET_IP"
echo "  Queue Service: http://$DROPLET_IP/queue/"
echo "  Indexer Service: http://$DROPLET_IP/indexer/"
echo "  Health Check: http://$DROPLET_IP/health"
echo ""
echo "🔍 Test endpoints:"
echo "  curl http://$DROPLET_IP/queue/health"
echo "  curl http://$DROPLET_IP/indexer/health"
echo "  curl -H 'x-api-key: test-master-key-12345' http://$DROPLET_IP/queue/api/explain"
echo ""
print_warning "Remember to update DNS settings to point to the new droplet IP: $DROPLET_IP"