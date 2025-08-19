#!/bin/bash

# ============================================
# Mech Service Build, Push & Deploy Script
# ============================================
# Usage: ./deploy-service.sh <service-name> [version]
# Example: ./deploy-service.sh mech-queue latest

set -e

# Configuration
DOCKER_REGISTRY="derivativelabs"  # Docker Hub organization
PRODUCTION_SERVER="207.148.31.73"
SSH_KEY="$HOME/.ssh/vultr_mech_machines"

# Load Docker credentials from .env if exists
if [ -f ".env" ]; then
    export $(cat .env | grep -E "^DOCKER_|^VULTR_" | xargs)
fi

# Use Docker Hub credentials (check multiple possible env var names)
DOCKER_USERNAME="${DOCKER_USERNAME:-${DOCKER_HUB_USERNAME:-}}"
DOCKER_PASSWORD="${DOCKER_TOKEN:-${DOCKER_HUB_TOKEN:-${DOCKER_PASSWORD:-}}}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Service port mapping
# Using case statement for compatibility
get_service_port() {
    case "$1" in
        mech-queue) echo "3002" ;;
        mech-llms) echo "3008" ;;
        mech-storage) echo "3007" ;;
        mech-indexer) echo "3005" ;;
        mech-sequences) echo "3004" ;;
        mech-search) echo "3009" ;;
        mech-reader) echo "3001" ;;
        mech-memories) echo "3010" ;;
        *) echo "" ;;
    esac
}

# Functions
print_step() {
    echo -e "\n${BLUE}===> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Parse arguments
SERVICE_NAME=$1
VERSION=${2:-"latest"}

if [ -z "$SERVICE_NAME" ]; then
    echo "Usage: $0 <service-name> [version]"
    echo "Available services: mech-queue mech-llms mech-storage mech-indexer mech-sequences mech-search mech-reader mech-memories"
    exit 1
fi

SERVICE_PORT=$(get_service_port "$SERVICE_NAME")
if [ -z "$SERVICE_PORT" ]; then
    print_error "Unknown service: $SERVICE_NAME"
fi
SERVICE_DIR="./$SERVICE_NAME"

# Check prerequisites
if [ ! -d "$SERVICE_DIR" ]; then
    print_error "Service directory not found: $SERVICE_DIR"
fi

if [ ! -f "$SERVICE_DIR/Dockerfile" ]; then
    print_error "Dockerfile not found in $SERVICE_DIR"
fi

echo "============================================"
echo "Deploying: $SERVICE_NAME"
echo "Version: $VERSION"
echo "Port: $SERVICE_PORT"
echo "Server: $PRODUCTION_SERVER"
echo "============================================"

# ============================================
# STEP 0: Docker Login
# ============================================
print_step "Logging into Docker Registry"

# Check if we have credentials
if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ]; then
    echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin
    print_success "Docker login successful"
else
    # Check if already logged in
    if docker system info | grep -q "Username"; then
        print_success "Already logged into Docker"
    else
        print_warning "No Docker credentials found. Attempting to use existing session..."
        print_warning "If push fails, set DOCKER_USERNAME and DOCKER_PASSWORD in .env file"
    fi
fi

# ============================================
# STEP 1: Build the Docker image
# ============================================
print_step "Building Docker image"

cd "$SERVICE_DIR"

# Build for AMD64 (production architecture)
docker buildx build \
    --platform linux/amd64 \
    -t ${DOCKER_REGISTRY}/${SERVICE_NAME}:${VERSION} \
    -t ${DOCKER_REGISTRY}/${SERVICE_NAME}:latest \
    --push \
    .

if [ $? -eq 0 ]; then
    print_success "Docker image built and pushed"
else
    print_error "Docker build failed"
fi

cd ..

# ============================================
# STEP 2: Deploy to production server
# ============================================
print_step "Deploying to production server"

# Create remote deployment script
cat > /tmp/deploy-${SERVICE_NAME}.sh << EOF
#!/bin/bash
set -e

SERVICE_NAME="${SERVICE_NAME}"
SERVICE_PORT="${SERVICE_PORT}"
VERSION="${VERSION}"
IMAGE="${DOCKER_REGISTRY}/${SERVICE_NAME}:${VERSION}"
DOCKER_USERNAME="${DOCKER_USERNAME}"
DOCKER_PASSWORD="${DOCKER_PASSWORD}"

echo "Deploying \${SERVICE_NAME} version \${VERSION}..."

# Login to Docker if credentials provided
if [ -n "\${DOCKER_USERNAME}" ] && [ -n "\${DOCKER_PASSWORD}" ]; then
    echo "Logging into Docker registry..."
    echo "\${DOCKER_PASSWORD}" | docker login --username "\${DOCKER_USERNAME}" --password-stdin
fi

# Pull the new image
echo "Pulling Docker image..."
docker pull \${IMAGE}

# Stop and remove existing container
if docker ps -a | grep -q \${SERVICE_NAME}; then
    echo "Stopping existing container..."
    docker stop \${SERVICE_NAME} || true
    docker rm \${SERVICE_NAME} || true
fi

# Create environment file if it doesn't exist
ENV_FILE="/opt/mech-services/\${SERVICE_NAME}/.env"
if [ ! -f "\$ENV_FILE" ]; then
    mkdir -p /opt/mech-services/\${SERVICE_NAME}
    cat > \$ENV_FILE << 'ENVFILE'
NODE_ENV=production
PORT=\${SERVICE_PORT}
MONGODB_URI=mongodb://localhost:27017/mech
REDIS_HOST=localhost
REDIS_PORT=6379
ENVFILE
    echo "Created default environment file"
fi

# Add service-specific environment variables
case "\${SERVICE_NAME}" in
    mech-llms)
        grep -q "OPENAI_API_KEY" \$ENV_FILE || echo "OPENAI_API_KEY=" >> \$ENV_FILE
        grep -q "ANTHROPIC_API_KEY" \$ENV_FILE || echo "ANTHROPIC_API_KEY=" >> \$ENV_FILE
        ;;
    mech-storage)
        grep -q "R2_ACCESS_KEY" \$ENV_FILE || echo "R2_ACCESS_KEY=" >> \$ENV_FILE
        grep -q "R2_SECRET_KEY" \$ENV_FILE || echo "R2_SECRET_KEY=" >> \$ENV_FILE
        ;;
    mech-indexer)
        grep -q "GITHUB_TOKEN" \$ENV_FILE || echo "GITHUB_TOKEN=" >> \$ENV_FILE
        grep -q "OPENAI_API_KEY" \$ENV_FILE || echo "OPENAI_API_KEY=" >> \$ENV_FILE
        ;;
esac

# Run the new container
echo "Starting new container..."
docker run -d \
    --name \${SERVICE_NAME} \
    --network mech-network \
    -p 0.0.0.0:\${SERVICE_PORT}:\${SERVICE_PORT} \
    --env-file \$ENV_FILE \
    --restart unless-stopped \
    --health-cmd "curl -f http://localhost:\${SERVICE_PORT}/health || exit 1" \
    --health-interval 30s \
    --health-timeout 10s \
    --health-retries 3 \
    \${IMAGE}

# Wait for container to be healthy
echo "Waiting for container to be healthy..."
for i in {1..30}; do
    STATUS=\$(docker inspect --format='{{.State.Health.Status}}' \${SERVICE_NAME} 2>/dev/null || echo "starting")
    if [ "\$STATUS" = "healthy" ]; then
        echo "✅ Container is healthy!"
        break
    fi
    echo "Status: \$STATUS (attempt \$i/30)"
    sleep 2
done

# Verify the service is responding
if curl -sf http://localhost:\${SERVICE_PORT}/health > /dev/null; then
    echo "✅ Service is responding on port \${SERVICE_PORT}"
    docker ps | grep \${SERVICE_NAME}
else
    echo "⚠️  Service health check failed"
    docker logs --tail 50 \${SERVICE_NAME}
    exit 1
fi
EOF

# Copy and execute on server
print_step "Copying deployment script to server"
scp -o StrictHostKeyChecking=no -i ${SSH_KEY} /tmp/deploy-${SERVICE_NAME}.sh root@${PRODUCTION_SERVER}:/tmp/

print_step "Executing deployment"
ssh -o StrictHostKeyChecking=no -i ${SSH_KEY} root@${PRODUCTION_SERVER} \
    "chmod +x /tmp/deploy-${SERVICE_NAME}.sh && /tmp/deploy-${SERVICE_NAME}.sh"

# ============================================
# STEP 3: Verify deployment
# ============================================
print_step "Verifying deployment"

# Test internal health
echo -n "Testing internal health... "
INTERNAL_STATUS=$(ssh -o StrictHostKeyChecking=no -i ${SSH_KEY} root@${PRODUCTION_SERVER} \
    "curl -s http://localhost:${SERVICE_PORT}/health | python3 -c 'import sys,json; print(json.load(sys.stdin).get(\"status\",\"unknown\"))' 2>/dev/null" || echo "failed")

if [ "$INTERNAL_STATUS" = "healthy" ]; then
    print_success "Internal health check passed"
else
    print_warning "Internal health check: $INTERNAL_STATUS"
fi

# Test external access
DOMAIN_NAME=$(echo ${SERVICE_NAME} | sed 's/mech-//')
EXTERNAL_URL="https://${DOMAIN_NAME}.mech.is/health"

echo -n "Testing external access at ${EXTERNAL_URL}... "
if curl -sf --max-time 5 ${EXTERNAL_URL} > /dev/null 2>&1; then
    print_success "External access verified"
else
    print_warning "External access not available (may need DNS/firewall configuration)"
fi

# Cleanup
rm -f /tmp/deploy-${SERVICE_NAME}.sh

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
print_success "DEPLOYMENT COMPLETE!"
echo "============================================"
echo "Service: ${SERVICE_NAME}"
echo "Version: ${VERSION}"
echo "Internal: http://${PRODUCTION_SERVER}:${SERVICE_PORT}"
echo "External: ${EXTERNAL_URL}"
echo "============================================"

# Show container status
ssh -o StrictHostKeyChecking=no -i ${SSH_KEY} root@${PRODUCTION_SERVER} \
    "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'NAMES|${SERVICE_NAME}'"