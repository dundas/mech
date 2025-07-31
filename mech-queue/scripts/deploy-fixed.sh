#!/bin/bash

# DigitalOcean Queue Service Deployment Script - Fixed Version
set -e

echo "🚀 Deploying Queue Service to DigitalOcean (Fixed)..."

# Configuration
REGISTRY_NAME=${REGISTRY_NAME:-"queue-service-registry"}
IMAGE_NAME=${IMAGE_NAME:-"queue-service"}
DROPLET_NAME=${DROPLET_NAME:-"queue-service"}
DROPLET_IP="138.197.15.235"  # Known droplet IP

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    print_error "doctl is not installed. Please install it first:"
    echo "  brew install doctl  # on macOS"
    echo "  snap install doctl  # on Ubuntu"
    exit 1
fi

# Check if docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Build the Docker image (excluding .env file)
print_status "Building Docker image..."
cat > .dockerignore << EOF
.env
.env.local
.env.development
logs/
node_modules/
.git/
.gitignore
*.log
EOF

docker build -t $IMAGE_NAME:latest .

# Login to registry
print_status "Logging into DigitalOcean Container Registry..."
doctl registry login

# Tag and push image
FULL_IMAGE_NAME="registry.digitalocean.com/$REGISTRY_NAME/$IMAGE_NAME:latest"
print_status "Pushing image to registry..."
docker tag $IMAGE_NAME:latest $FULL_IMAGE_NAME
docker push $FULL_IMAGE_NAME

# Get Valkey database connection details
print_status "Getting Valkey database connection details..."
DB_INFO=$(doctl databases list --format Name,ID --no-header | grep "queue-valkey" || true)

if [ -z "$DB_INFO" ]; then
    print_error "Valkey database 'queue-valkey' not found!"
    print_warning "Please create it first with: doctl databases create queue-valkey --engine valkey --region nyc3 --size db-s-1vcpu-1gb --num-nodes 1"
    exit 1
fi

DB_ID=$(echo $DB_INFO | awk '{print $2}')
DB_HOST=$(doctl databases connection $DB_ID --format Host --no-header)
DB_PORT=$(doctl databases connection $DB_ID --format Port --no-header)
DB_PASSWORD=$(doctl databases connection $DB_ID --format Password --no-header)

print_status "Valkey connection details retrieved"

# Generate secure API key if not provided
if [ -z "$MASTER_API_KEY" ]; then
    MASTER_API_KEY=$(openssl rand -hex 32)
    print_warning "Generated new MASTER_API_KEY: $MASTER_API_KEY"
fi

# Create deployment script for the droplet
print_status "Creating deployment script..."
cat > deploy-on-droplet.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

# Stop and remove existing containers
echo "Stopping existing containers..."
docker stop queue-service 2>/dev/null || true
docker rm queue-service 2>/dev/null || true

# Login to registry
doctl registry login

# Pull the latest image
echo "Pulling latest image..."
docker pull FULL_IMAGE_NAME_PLACEHOLDER

# Run the container with proper environment variables
echo "Starting new container..."
docker run -d \
    --name queue-service \
    --restart unless-stopped \
    -p 3003:3003 \
    -p 3004:3004 \
    -e NODE_ENV=production \
    -e PORT=3003 \
    -e REDIS_HOST=VALKEY_HOST_PLACEHOLDER \
    -e REDIS_PORT=VALKEY_PORT_PLACEHOLDER \
    -e REDIS_PASSWORD=VALKEY_PASSWORD_PLACEHOLDER \
    -e REDIS_DB=0 \
    -e MONGODB_URI="${MONGODB_URI:-mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/queue?retryWrites=true&w=majority&appName=MAIN}" \
    -e MASTER_API_KEY=MASTER_API_KEY_PLACEHOLDER \
    -e ENABLE_API_KEY_AUTH=true \
    -e ENABLE_PROMETHEUS_METRICS=true \
    -e METRICS_PORT=3004 \
    -e LOG_LEVEL=info \
    -e MAX_WORKERS_PER_QUEUE=10 \
    -e RATE_LIMIT_MAX_REQUESTS=1000 \
    -e RATE_LIMIT_WINDOW_MS=60000 \
    -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
    FULL_IMAGE_NAME_PLACEHOLDER

# Wait for service to be ready
echo "Waiting for service to be ready..."
sleep 10

# Test the deployment
if curl -f http://localhost:3003/health; then
    echo "✅ Service is healthy!"
else
    echo "❌ Service health check failed"
    docker logs queue-service
    exit 1
fi
DEPLOY_SCRIPT

# Replace placeholders in the deployment script
sed -i.bak "s|FULL_IMAGE_NAME_PLACEHOLDER|$FULL_IMAGE_NAME|g" deploy-on-droplet.sh
sed -i.bak "s|VALKEY_HOST_PLACEHOLDER|$DB_HOST|g" deploy-on-droplet.sh
sed -i.bak "s|VALKEY_PORT_PLACEHOLDER|$DB_PORT|g" deploy-on-droplet.sh
sed -i.bak "s|VALKEY_PASSWORD_PLACEHOLDER|$DB_PASSWORD|g" deploy-on-droplet.sh
sed -i.bak "s|MASTER_API_KEY_PLACEHOLDER|$MASTER_API_KEY|g" deploy-on-droplet.sh
rm deploy-on-droplet.sh.bak

# Copy and execute deployment script on droplet
print_status "Deploying to droplet..."
scp -o StrictHostKeyChecking=no deploy-on-droplet.sh root@$DROPLET_IP:/tmp/
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP "bash /tmp/deploy-on-droplet.sh"

# Clean up
rm deploy-on-droplet.sh
rm .dockerignore

print_status "Deployment complete!"
echo ""
echo "📋 Deployment Summary:"
echo "  Registry: $FULL_IMAGE_NAME"
echo "  Droplet: $DROPLET_NAME ($DROPLET_IP)"
echo "  Valkey: $DB_HOST:$DB_PORT"
echo ""
echo "🔗 Service URLs:"
echo "  Health: http://$DROPLET_IP:3003/health"
echo "  Health (Domain): https://queue.mech.is/health"
echo "  API: http://$DROPLET_IP:3003/api/queues"
echo "  API (Domain): https://queue.mech.is/api/queues"
echo "  Metrics: http://$DROPLET_IP:3004/metrics"
echo ""
echo "🔑 Master API Key: $MASTER_API_KEY"
echo ""
print_warning "Save the API key securely - you'll need it to access the API!"
echo ""
echo "🧪 Test your deployment:"
echo "  # Test via IP:"
echo "  curl http://$DROPLET_IP:3003/health"
echo "  curl -H \"x-api-key: $MASTER_API_KEY\" http://$DROPLET_IP:3003/api/queues"
echo ""
echo "  # Test via domain:"
echo "  curl https://queue.mech.is/health"
echo "  curl -H \"x-api-key: $MASTER_API_KEY\" https://queue.mech.is/api/queues"