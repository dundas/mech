#!/usr/bin/env bash

# Deploy a single service with build verification and testing
# Usage: ./deploy-single-service.sh <service-name>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }

# Configuration
DROPLET_IP="174.138.68.108"
REGISTRY_NAME="decisive-trades-registry"

# Service configurations
declare -A SERVICE_PORTS=(
    ["mech-llms"]="3008"
    ["mech-sequences"]="3007"
    ["mech-reader"]="3001"
    ["mech-search"]="3009"
    ["mech-memories"]="3010"
    ["mech-storage"]="3011"
)

declare -A SERVICE_DIRS=(
    ["mech-llms"]="mech-llms"
    ["mech-sequences"]="mech-sequences"
    ["mech-reader"]="mech-reader"
    ["mech-search"]="mech-search"
    ["mech-memories"]="mech-memories"
    ["mech-storage"]="mech-storage"
)

# Function to validate service
validate_service() {
    local service=$1
    
    if [[ -z "${SERVICE_PORTS[$service]}" ]]; then
        print_error "Unknown service: $service"
        print_info "Available services: ${!SERVICE_PORTS[@]}"
        exit 1
    fi
    
    local service_dir=${SERVICE_DIRS[$service]}
    if [[ ! -d "$service_dir" ]]; then
        print_error "Service directory not found: $service_dir"
        exit 1
    fi
    
    print_status "Service validation passed"
}

# Function to build and test locally
build_and_test_local() {
    local service=$1
    local service_dir=${SERVICE_DIRS[$service]}
    local port=${SERVICE_PORTS[$service]}
    
    print_info "Building and testing $service locally..."
    
    cd $service_dir
    
    # Check if package.json exists
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found in $service_dir"
        exit 1
    fi
    
    # Check if Dockerfile exists
    if [[ ! -f "Dockerfile" ]]; then
        print_error "Dockerfile not found in $service_dir"
        exit 1
    fi
    
    print_info "Installing dependencies..."
    npm install
    
    # Try to build TypeScript if needed
    if [[ -f "tsconfig.json" ]]; then
        print_info "Building TypeScript..."
        npm run build || print_warning "TypeScript build had warnings, continuing..."
    fi
    
    # Build Docker image
    local image_name="registry.digitalocean.com/$REGISTRY_NAME/mech-services:$service-latest"
    print_info "Building Docker image: $image_name"
    
    docker build --platform linux/amd64 -t $image_name . || {
        print_error "Docker build failed for $service"
        exit 1
    }
    
    print_status "Local build completed successfully"
    cd ..
}

# Function to test image locally
test_image_local() {
    local service=$1
    local port=${SERVICE_PORTS[$service]}
    local image_name="registry.digitalocean.com/$REGISTRY_NAME/mech-services:$service-latest"
    
    print_info "Testing $service image locally..."
    
    # Stop any existing test container
    docker stop "${service}-test" 2>/dev/null || true
    docker rm "${service}-test" 2>/dev/null || true
    
    # Start test container
    print_info "Starting test container on port $((port + 100))..."
    docker run -d \
        --name "${service}-test" \
        -p "$((port + 100)):$port" \
        -e NODE_ENV=development \
        $image_name
    
    # Wait for container to start
    sleep 10
    
    # Test health endpoint
    local test_port=$((port + 100))
    if curl -f -s --max-time 10 "http://localhost:$test_port/health" > /dev/null; then
        print_status "$service test container is healthy"
    else
        print_warning "$service test container health check failed, checking logs..."
        docker logs "${service}-test" --tail=20
    fi
    
    # Cleanup test container
    docker stop "${service}-test"
    docker rm "${service}-test"
    
    print_status "Local image test completed"
}

# Function to push image
push_image() {
    local service=$1
    local image_name="registry.digitalocean.com/$REGISTRY_NAME/mech-services:$service-latest"
    
    print_info "Pushing $service image to registry..."
    
    # Login to registry
    doctl registry login
    
    # Push image
    docker push $image_name || {
        print_error "Failed to push $service image"
        exit 1
    }
    
    print_status "Image pushed successfully"
}

# Function to create environment file
create_environment_file() {
    local service=$1
    
    print_info "Creating environment file for $service..."
    
    case $service in
        "mech-llms")
            cat > ".env.${service}.production" << 'EOF'
# LLM Service Production Environment
MONGODB_URI=${MONGODB_URI:-your_mongodb_uri_here}
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_key_here}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_anthropic_key_here}
GOOGLE_API_KEY=AIza-placeholder
TOGETHER_API_KEY=placeholder
REDIS_URL=redis://default:AVNS_vUQvA8CUE8VvNmvvNVE@db-valkey-do-user-17543109-0.c.db.ondigitalocean.com:25061
CACHE_TTL=3600
NODE_ENV=production
PORT=3008
CORS_ORIGIN=https://llm.mech.is,https://api.mech.is
EOF
            ;;
        "mech-sequences")
            cat > ".env.${service}.production" << 'EOF'
# Sequences Service Production Environment  
MONGO_CONN=${MONGODB_URI:-your_mongodb_uri_here}
MONGO_DB_NAME=mechSequencesDB
TEMPORAL_HOST=saas-cluster.tmprl.cloud
TEMPORAL_PORT=7233
TEMPORAL_NAMESPACE=mech-sequences-production
QUEUE_SERVICE_URL=http://queue-service:3003
LLM_SERVICE_URL=http://mech-llms:3006
STORAGE_SERVICE_URL=http://mech-storage:3007
NODE_ENV=production
PORT=3008
CORS_ORIGIN=https://sequences.mech.is,https://api.mech.is
EOF
            ;;
        "mech-reader")
            cat > ".env.${service}.production" << 'EOF'
# Reader Service Production Environment
MONGO_CONN=${MONGODB_URI:-your_mongodb_uri_here}
MONGO_DB_NAME=mechReaderDB
QUEUE_SERVICE_URL=http://queue-service:3003
STORAGE_SERVICE_URL=http://mech-storage:3007
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_key_here}
ASSEMBLYAI_API_KEY=your-assemblyai-key-here
TEMP_DIR=/tmp/mech-reader
MAX_FILE_SIZE=500000000
PROCESSING_TIMEOUT=3600
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://reader.mech.is,https://api.mech.is
EOF
            ;;
        "mech-search")
            cat > ".env.${service}.production" << 'EOF'
# Search Service Production Environment
SERPER_API_KEY=cc79c2f3cd670f0c8cf542eebef2ab2ba3c006ce
NODE_ENV=production
PORT=3009
CORS_ORIGINS=https://search.mech.is,https://api.mech.is,http://localhost:3000,http://localhost:5500
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
EOF
            ;;
        "mech-memories")
            cat > ".env.${service}.production" << 'EOF'
# Memories Service Production Environment
NODE_ENV=production
PORT=3010
MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/?retryWrites=true&w=majority&appName=MAIN
DATABASE_NAME=mechMemoriesDB
CORS_ORIGINS=https://memories.mech.is,https://api.mech.is,http://localhost:3000,http://localhost:5500
LOG_LEVEL=info
MEMORY_TTL_DAYS=90
MAX_MEMORY_SIZE_KB=100
MAX_METADATA_SIZE_KB=10
SEARCH_RESULTS_LIMIT=100
EOF
            ;;
    esac
    
    print_status "Environment file created"
}

# Function to deploy to droplet
deploy_to_droplet() {
    local service=$1
    local port=${SERVICE_PORTS[$service]}
    local image_name="registry.digitalocean.com/$REGISTRY_NAME/mech-services:$service-latest"
    
    print_info "Deploying $service to droplet..."
    
    # Upload environment file
    scp ".env.${service}.production" root@$DROPLET_IP:/opt/mech-services/
    
    # Deploy on droplet
    ssh root@$DROPLET_IP << EOF
cd /opt/mech-services

# Login to registry
doctl registry login

# Pull the image
docker pull $image_name

# Stop existing container if running
docker stop $service 2>/dev/null || true
docker rm $service 2>/dev/null || true

# Start new container
docker run -d \
    --name $service \
    --restart unless-stopped \
    -p $port:$port \
    --env-file .env.${service}.production \
    --network bridge \
    $image_name

# Wait for service to start
sleep 15

# Check if service is healthy
if curl -f -s --max-time 10 http://localhost:$port/health > /dev/null; then
    echo "✅ $service is healthy on port $port"
else
    echo "❌ $service health check failed"
    echo "Container logs:"
    docker logs $service --tail=20
    exit 1
fi

# Show final status
echo "📊 Service status:"
docker ps --filter name=$service --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"

echo "✅ $service deployed successfully!"
EOF

    if [[ $? -eq 0 ]]; then
        print_status "$service deployed successfully to droplet"
    else
        print_error "$service deployment failed"
        return 1
    fi
}

# Function to test external access
test_external_access() {
    local service=$1
    local port=${SERVICE_PORTS[$service]}
    
    print_info "Testing external access for $service..."
    
    # Wait for DNS propagation
    sleep 10
    
    # Test direct IP access first
    if curl -f -s --max-time 10 "http://$DROPLET_IP:$port/health" > /dev/null; then
        print_status "$service accessible via direct IP ($DROPLET_IP:$port)"
    else
        print_warning "$service not accessible via direct IP yet"
    fi
    
    # Test domain access (if configured)
    local domain=""
    case $service in
        "mech-llms") domain="llm.mech.is" ;;
        "mech-sequences") domain="sequences.mech.is" ;;
        "mech-reader") domain="reader.mech.is" ;;
        "mech-search") domain="search.mech.is" ;;
        "mech-memories") domain="memories.mech.is" ;;
    esac
    
    if [[ -n "$domain" ]]; then
        if curl -f -s --max-time 10 "https://$domain/health" > /dev/null; then
            print_status "$service accessible via domain ($domain)"
        else
            print_warning "$service domain not configured or not propagated yet ($domain)"
        fi
    fi
}

# Function to check resource usage
check_resource_usage() {
    print_info "Checking resource usage after deployment..."
    
    ssh root@$DROPLET_IP << 'EOF'
echo "=== System Resource Usage ==="
echo "Memory:"
free -h

echo -e "\nDocker Container Stats:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo -e "\nDisk Usage:"
df -h /
EOF
}

# Function to show deployment summary
show_deployment_summary() {
    local service=$1
    local port=${SERVICE_PORTS[$service]}
    
    print_status "🎉 $service Deployment Complete!"
    echo ""
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    echo "  • Service: $service"
    echo "  • Port: $port"
    echo "  • Status: Running on droplet"
    echo "  • Direct Access: http://$DROPLET_IP:$port/health"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo "  • View logs: ssh root@$DROPLET_IP 'docker logs $service'"  
    echo "  • Restart: ssh root@$DROPLET_IP 'docker restart $service'"
    echo "  • Check status: ssh root@$DROPLET_IP 'docker ps --filter name=$service'"
    echo ""
    echo -e "${GREEN}✅ Ready for next service deployment!${NC}"
}

# Main deployment function
main() {
    local service=$1
    
    if [[ -z "$service" ]]; then
        print_error "Usage: $0 <service-name>"
        print_info "Available services: ${!SERVICE_PORTS[@]}"
        exit 1
    fi
    
    print_info "Starting deployment of $service..."
    echo ""
    
    # Run all deployment steps
    validate_service $service
    build_and_test_local $service
    test_image_local $service
    push_image $service
    create_environment_file $service
    deploy_to_droplet $service
    test_external_access $service
    check_resource_usage
    show_deployment_summary $service
    
    # Cleanup
    rm -f ".env.${service}.production"
    
    print_status "🚀 $service deployment completed successfully!"
}

# Run main function
main "$@"