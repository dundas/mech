#!/bin/bash

# DigitalOcean Queue Service Deployment Script
set -e

echo "🚀 Deploying Queue Service to DigitalOcean..."

# Configuration
REGISTRY_NAME=${REGISTRY_NAME:-"queue-service-registry"}
IMAGE_NAME=${IMAGE_NAME:-"queue-service"}
DROPLET_NAME=${DROPLET_NAME:-"queue-service"}
REGION=${REGION:-"nyc3"}
SIZE=${SIZE:-"s-2vcpu-2gb"}

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

# Build the Docker image
print_status "Building Docker image..."
docker build -t $IMAGE_NAME:latest .

# Create DigitalOcean Container Registry if it doesn't exist
print_status "Setting up DigitalOcean Container Registry..."
if ! doctl registry get $REGISTRY_NAME &> /dev/null; then
    doctl registry create $REGISTRY_NAME
    print_status "Created registry: $REGISTRY_NAME"
else
    print_warning "Registry $REGISTRY_NAME already exists"
fi

# Login to registry
doctl registry login

# Tag and push image
FULL_IMAGE_NAME="registry.digitalocean.com/$REGISTRY_NAME/$IMAGE_NAME:latest"
print_status "Pushing image to registry..."
docker tag $IMAGE_NAME:latest $FULL_IMAGE_NAME
docker push $FULL_IMAGE_NAME

# Create Valkey database if it doesn't exist
print_status "Setting up Valkey database..."
if ! doctl databases list | grep -q "queue-valkey"; then
    doctl databases create queue-valkey \
        --engine valkey \
        --region $REGION \
        --size db-s-1vcpu-1gb \
        --num-nodes 1
    
    print_status "Created Valkey database: queue-valkey"
    print_warning "Database is being created. This may take a few minutes..."
    
    # Wait for database to be ready
    while true; do
        STATUS=$(doctl databases list --format Status --no-header | grep queue-valkey | head -1)
        if [ "$STATUS" = "online" ]; then
            break
        fi
        echo "Waiting for database to be ready... (current status: $STATUS)"
        sleep 30
    done
else
    print_warning "Valkey database already exists"
fi

# Get database connection details
print_status "Getting database connection details..."
DB_HOST=$(doctl databases connection queue-valkey --format Host --no-header)
DB_PORT=$(doctl databases connection queue-valkey --format Port --no-header)
DB_PASSWORD=$(doctl databases connection queue-valkey --format Password --no-header)

# Create droplet if it doesn't exist
print_status "Setting up droplet..."
if ! doctl compute droplet list | grep -q "$DROPLET_NAME"; then
    # Get SSH key ID (assumes you have at least one SSH key)
    SSH_KEY_ID=$(doctl compute ssh-key list --format ID --no-header | head -1)
    
    doctl compute droplet create $DROPLET_NAME \
        --image docker-20-04 \
        --size $SIZE \
        --region $REGION \
        --ssh-keys $SSH_KEY_ID \
        --wait
    
    print_status "Created droplet: $DROPLET_NAME"
else
    print_warning "Droplet $DROPLET_NAME already exists"
fi

# Get droplet IP
DROPLET_IP=$(doctl compute droplet list --format Name,PublicIPv4 --no-header | grep $DROPLET_NAME | awk '{print $2}')
print_status "Droplet IP: $DROPLET_IP"

# Generate secure API key
MASTER_API_KEY=$(openssl rand -hex 32)

# Create deployment files
print_status "Creating deployment files..."

# Create production environment file
cat > .env.production.deploy << EOF
VALKEY_HOST=$DB_HOST
VALKEY_PORT=$DB_PORT
VALKEY_PASSWORD=$DB_PASSWORD
VALKEY_DB=0
MASTER_API_KEY=$MASTER_API_KEY
ENABLE_PROMETHEUS_METRICS=true
LOG_LEVEL=info
MAX_WORKERS_PER_QUEUE=10
EOF

# Update docker-compose.prod.yml with correct image name
sed "s|referwith-queue-service:latest|$FULL_IMAGE_NAME|g" docker-compose.prod.yml > docker-compose.deploy.yml

print_status "Deploying to droplet..."

# Copy files to droplet and deploy
scp -o StrictHostKeyChecking=no .env.production.deploy docker-compose.deploy.yml root@$DROPLET_IP:/root/

# Deploy on droplet
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << EOF
    # Install docker-compose if not present
    if ! command -v docker-compose &> /dev/null; then
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    # Set up firewall
    ufw allow 22
    ufw allow 3003
    ufw allow 3004
    ufw --force enable
    
    # Deploy the application
    docker-compose -f docker-compose.deploy.yml --env-file .env.production.deploy up -d
    
    echo "Waiting for service to be ready..."
    sleep 30
    
    # Test the deployment
    if curl -f http://localhost:3003/health; then
        echo "✅ Service is healthy!"
    else
        echo "❌ Service health check failed"
        exit 1
    fi
EOF

# Clean up local files
rm .env.production.deploy docker-compose.deploy.yml

print_status "Deployment complete!"
echo ""
echo "📋 Deployment Summary:"
echo "  Registry: $FULL_IMAGE_NAME"
echo "  Droplet: $DROPLET_NAME ($DROPLET_IP)"
echo "  Database: queue-valkey ($DB_HOST:$DB_PORT)"
echo ""
echo "🔗 Service URLs:"
echo "  Health: http://$DROPLET_IP:3003/health"
echo "  API: http://$DROPLET_IP:3003/api/queues"
echo "  Metrics: http://$DROPLET_IP:3004/metrics"
echo ""
echo "🔑 Master API Key: $MASTER_API_KEY"
echo ""
print_warning "Save the API key securely - you'll need it to access the API!"
echo ""
echo "🧪 Test your deployment:"
echo "  curl http://$DROPLET_IP:3003/health"
echo "  curl -H \"x-api-key: $MASTER_API_KEY\" http://$DROPLET_IP:3003/api/queues"