#!/bin/bash

# 🚀 Build and Push All Mech Services to Docker Hub
# Updated to include mech-machines as 7th service

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Building and Pushing All Mech Services to Docker Hub${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Docker Hub configuration
DOCKER_HUB_ORG="derivativelabs"
DOCKER_HUB_REPO="mech"

# Updated service list (7 services including mech-machines)
SERVICES=(
    "reader"
    "indexer" 
    "search"
    "storage"
    "sequences"
    "registry"
    "machines"
)

# Service mappings (compatible with all shells)
get_service_dir() {
    case $1 in
        "reader") echo "mech-reader" ;;
        "indexer") echo "mech-indexer" ;;
        "search") echo "mech-search" ;;
        "storage") echo "mech-storage" ;;
        "sequences") echo "mech-sequences" ;;
        "registry") echo "mech-registry" ;;
        "machines") echo "mech-machines" ;;
        *) echo "" ;;
    esac
}

get_service_port() {
    case $1 in
        "reader") echo "3000" ;;
        "indexer") echo "3001" ;;
        "search") echo "3002" ;;
        "storage") echo "3007" ;;
        "sequences") echo "3003" ;;
        "registry") echo "3004" ;;
        "machines") echo "8080" ;;
        *) echo "8080" ;;
    esac
}

echo "📊 Deployment Summary:"
echo "• Total Services: ${#SERVICES[@]}"
echo "• Docker Hub: ${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}"
echo "• Tags: service-latest, service-dev, service-staging"
echo "• Ultra Budget Cost: 7 × \$3.50 = \$24.50/month"
echo "• Total with Docker Hub: \$39.50/month"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check Docker Hub login
echo "🔐 Checking Docker Hub authentication..."
if docker system info | grep -q "Username:"; then
    echo -e "${GREEN}✅ Already logged into Docker Hub${NC}"
else
    echo -e "${YELLOW}⚠️  Please log into Docker Hub:${NC}"
    echo "docker login"
    read -p "Press Enter after logging in..."
fi

echo ""
echo "🔨 Building and Pushing Services:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Build and push each service
for service in "${SERVICES[@]}"; do
    service_dir=$(get_service_dir "$service")
    port=$(get_service_port "$service")
    
    echo ""
    echo -e "${BLUE}📦 Building: $service${NC}"
    echo "   Directory: $service_dir"
    echo "   Port: $port"
    
    # Check if service directory exists
    if [ ! -d "$service_dir" ]; then
        echo -e "${RED}❌ Directory $service_dir not found${NC}"
        continue
    fi
    
    # Check if Dockerfile exists
    if [ ! -f "$service_dir/Dockerfile" ]; then
        echo -e "${RED}❌ Dockerfile not found in $service_dir${NC}"
        continue
    fi
    
    cd "$service_dir"
    
    # Build images for different environments
    echo "   🔨 Building production image..."
    docker build -t "${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}:${service}-latest" .
    
    echo "   🔨 Building development image..."
    docker build -t "${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}:${service}-dev" .
    
    echo "   🔨 Building staging image..."
    docker build -t "${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}:${service}-staging" .
    
    # Push images
    echo "   📤 Pushing production image..."
    docker push "${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}:${service}-latest"
    
    echo "   📤 Pushing development image..."
    docker push "${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}:${service}-dev"
    
    echo "   📤 Pushing staging image..."
    docker push "${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}:${service}-staging"
    
    echo -e "${GREEN}   ✅ $service completed${NC}"
    
    cd ..
done

echo ""
echo "🧪 Testing Image Pulls:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test pulling images
for service in "${SERVICES[@]}"; do
    echo "   Testing: ${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}:${service}-latest"
    if docker pull "${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}:${service}-latest" >/dev/null 2>&1; then
        echo -e "${GREEN}   ✅ ${service} image available${NC}"
    else
        echo -e "${RED}   ❌ ${service} image failed${NC}"
    fi
done

echo ""
echo "📋 Built Images Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker images | grep "${DOCKER_HUB_ORG}/${DOCKER_HUB_REPO}" | head -20

echo ""
echo "🚀 Deployment Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for service in "${SERVICES[@]}"; do
    echo "./mech-machines/deploy-simple.sh -s $service -e production -p \"vc2-1c-512mb\""
done

echo ""
echo "💰 Updated Cost Analysis:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "• 7 × Vultr vc2-1c-512mb: 7 × \$3.50 = \$24.50/month"
echo "• Docker Hub Team: \$15.00/month"
echo "• Total Infrastructure: \$39.50/month"

echo ""
echo -e "${GREEN}✅ All Mech services built and pushed successfully!${NC}"
echo -e "${GREEN}🎯 Ready for ultra-budget \$39.50/month deployment!${NC}"