#!/usr/bin/env bash

# Deploy services directly to server without registry
# This avoids registry limitations by building locally and loading on server

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
DROPLET_IP="207.148.31.73"
SSH_USER="root"

# Service configurations
declare -A SERVICE_PORTS=(
    ["mech-llms"]="3008"
    ["mech-sequences"]="3004"
    ["mech-reader"]="3001"
    ["mech-search"]="3009"
    ["mech-memories"]="3010"
    ["mech-storage"]="3007"
    ["mech-indexer"]="3005"
    ["mech-queue"]="3003"
    ["mech-machines"]="3006"
)

declare -A SERVICE_DIRS=(
    ["mech-llms"]="mech-llms"
    ["mech-sequences"]="mech-sequences"
    ["mech-reader"]="mech-reader"
    ["mech-search"]="mech-search"  
    ["mech-memories"]="mech-memories"
    ["mech-storage"]="mech-storage"
    ["mech-indexer"]="mech-indexer"
    ["mech-queue"]="mech-queue"
    ["mech-machines"]="mech-machines"
)

# Validate service
validate_service() {
    local service=$1
    
    if [[ -z "${SERVICE_PORTS[$service]}" ]]; then
        print_error "Unknown service: $service"
        print_info "Available services: ${!SERVICE_PORTS[@]}"
        exit 1
    fi
    
    if [[ ! -d "${SERVICE_DIRS[$service]}" ]]; then
        print_error "Service directory not found: ${SERVICE_DIRS[$service]}"
        exit 1
    fi
}

# Deploy service
deploy_service() {
    local service=$1
    local service_dir=${SERVICE_DIRS[$service]}
    local port=${SERVICE_PORTS[$service]}
    
    print_info "Deploying $service..."
    
    # Enter service directory
    cd "$service_dir" || exit 1
    
    # Build Docker image locally
    print_info "Building Docker image..."
    docker build --platform linux/amd64 -t "$service:latest" . || {
        print_error "Docker build failed"
        return 1
    }
    
    # Save image to tar file
    print_info "Saving Docker image..."
    docker save "$service:latest" | gzip > "$service.tar.gz" || {
        print_error "Failed to save Docker image"
        return 1
    }
    
    # Transfer to server
    print_info "Transferring to server..."
    scp -i ~/.ssh/vultr_mech_machines "$service.tar.gz" "$SSH_USER@$DROPLET_IP:/tmp/" || {
        print_error "Failed to transfer image"
        rm -f "$service.tar.gz"
        return 1
    }
    
    # Clean up local tar file
    rm -f "$service.tar.gz"
    
    # Load and run on server
    print_info "Loading and running on server..."
    
    # Create deployment script
    cat > deploy_on_server.sh << 'EOF'
#!/bin/bash
SERVICE=$1
PORT=$2
ENV_FILE=$3

# Load the Docker image
echo "Loading Docker image..."
docker load < /tmp/${SERVICE}.tar.gz

# Stop existing container
echo "Stopping existing container..."
docker stop ${SERVICE} 2>/dev/null || true
docker rm ${SERVICE} 2>/dev/null || true

# Run new container
echo "Starting new container..."
docker run -d \
    --name ${SERVICE} \
    --restart unless-stopped \
    -p ${PORT}:${PORT} \
    --env-file ${ENV_FILE} \
    --network mech-network \
    ${SERVICE}:latest

# Clean up
rm -f /tmp/${SERVICE}.tar.gz

# Check status
sleep 5
docker ps | grep ${SERVICE}
EOF

    # Copy env file
    local env_file="../.env.${service}.production"
    if [[ -f "$env_file" ]]; then
        print_info "Copying environment file..."
        scp -i ~/.ssh/vultr_mech_machines "$env_file" "$SSH_USER@$DROPLET_IP:/root/.env.${service}" || {
            print_error "Failed to copy env file"
            return 1
        }
    else
        print_warning "No production env file found at $env_file"
    fi
    
    # Copy and execute deployment script
    scp -i ~/.ssh/vultr_mech_machines deploy_on_server.sh "$SSH_USER@$DROPLET_IP:/tmp/deploy_${service}.sh"
    ssh -i ~/.ssh/vultr_mech_machines "$SSH_USER@$DROPLET_IP" "chmod +x /tmp/deploy_${service}.sh && /tmp/deploy_${service}.sh $service $port /root/.env.${service}"
    
    # Clean up
    rm -f deploy_on_server.sh
    
    # Return to project root
    cd ..
    
    print_status "$service deployed successfully"
}

# Check for SSH access
check_ssh_access() {
    print_info "Checking SSH access to $DROPLET_IP..."
    if ! ssh -i ~/.ssh/vultr_mech_machines -o ConnectTimeout=10 "$SSH_USER@$DROPLET_IP" "echo 'SSH connection successful'" > /dev/null 2>&1; then
        print_error "Cannot connect to server via SSH"
        print_info "Please ensure:"
        print_info "  1. SSH key is configured"
        print_info "  2. Server is accessible"
        print_info "  3. Firewall allows SSH"
        exit 1
    fi
    print_status "SSH access confirmed"
}

# Create Docker network on server
ensure_docker_network() {
    print_info "Ensuring Docker network exists..."
    ssh -i ~/.ssh/vultr_mech_machines "$SSH_USER@$DROPLET_IP" "docker network create mech-network 2>/dev/null || true"
}

# Main
main() {
    local service=$1
    
    if [[ -z "$service" ]]; then
        print_error "Usage: $0 <service-name>"
        print_info "Available services: ${!SERVICE_PORTS[@]}"
        exit 1
    fi
    
    validate_service "$service"
    check_ssh_access
    ensure_docker_network
    deploy_service "$service"
    
    # Test deployment
    print_info "Testing deployment..."
    local port=${SERVICE_PORTS[$service]}
    sleep 10
    
    if curl -s -o /dev/null "http://$DROPLET_IP:$port/health" 2>/dev/null; then
        print_status "$service is healthy at http://$DROPLET_IP:$port"
    else
        print_warning "Health check failed - service may still be starting"
        print_info "Check logs with: ssh -i ~/.ssh/vultr_mech_machines $SSH_USER@$DROPLET_IP 'docker logs $service'"
    fi
}

main "$@"