#!/usr/bin/env bash

# Deploy all services to production Vultr server
# Uses environment variables and secure credential management

set -e

SERVER_IP="207.148.31.73"
SSH_KEY="~/.ssh/vultr_mech_machines"

echo "🚀 Deploying Mech Services to Production"
echo "========================================"
echo "Server: $SERVER_IP"
echo ""

# Services to deploy
SERVICES=(
    "mech-storage:3007"
    "mech-queue:3003"  
    "mech-llms:3008"
    "mech-reader:3001"
    "mech-indexer:3005"
    "mech-search:3009"
    "mech-sequences:3004"
    "mech-memories:3010"
)

# Deploy service
deploy_service() {
    local service_port=$1
    local service=${service_port%:*}
    local port=${service_port#*:}
    
    echo ""
    echo "📦 Deploying $service on port $port"
    echo "=================================="
    
    if [ ! -d "$service" ]; then
        echo "⚠️  Directory $service not found, skipping"
        return
    fi
    
    cd "$service"
    
    # Build image
    echo "🏗️  Building Docker image..."
    docker build --platform linux/amd64 -t "$service:latest" . || {
        echo "❌ Build failed for $service"
        cd ..
        return 1
    }
    
    # Save and transfer
    echo "📤 Transferring to server..."
    docker save "$service:latest" | gzip > "$service.tar.gz"
    scp -i $SSH_KEY "$service.tar.gz" "root@$SERVER_IP:/tmp/"
    rm "$service.tar.gz"
    
    # Deploy on server
    echo "🚀 Deploying on server..."
    ssh -i $SSH_KEY "root@$SERVER_IP" << EOF
# Load image
docker load < /tmp/$service.tar.gz
rm -f /tmp/$service.tar.gz

# Stop existing container
docker stop $service 2>/dev/null || true
docker rm $service 2>/dev/null || true

# Create environment file
cat > /root/.env.$service << 'ENVEOF'
NODE_ENV=production
PORT=$port

# MongoDB (update with your actual credentials)
MONGODB_URI=\${MONGODB_URI:-mongodb+srv://username:password@cluster/database}

# API Keys (update with your actual keys)
OPENAI_API_KEY=\${OPENAI_API_KEY:-your-openai-key}
ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY:-your-anthropic-key}

# Service URLs
QUEUE_SERVICE_URL=http://mech-queue:3003
STORAGE_SERVICE_URL=http://mech-storage:3007
LLM_SERVICE_URL=http://mech-llms:3008

# Security
LOG_LEVEL=info
CORS_ORIGIN=https://$service.mech.is,https://api.mech.is
ENVEOF

# Run container
docker run -d \\
  --name $service \\
  --restart unless-stopped \\
  -p $port:$port \\
  --env-file /root/.env.$service \\
  --network mech-network \\
  $service:latest

# Wait and check
sleep 5
if docker ps | grep -q $service; then
  echo "✅ $service is running"
else
  echo "❌ $service failed to start"
  docker logs $service
fi
EOF
    
    cd ..
    echo "✅ $service deployment complete"
}

# Ensure network exists on server
echo "🌐 Setting up Docker network..."
ssh -i $SSH_KEY "root@$SERVER_IP" "docker network create mech-network 2>/dev/null || echo 'Network exists'"

# Deploy all services
for service_port in "${SERVICES[@]}"; do
    deploy_service "$service_port"
done

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "Services should be available at:"
for service_port in "${SERVICES[@]}"; do
    local service=${service_port%:*}
    echo "  https://${service#mech-}.mech.is"
done

echo ""
echo "To check status:"
echo "  ssh -i $SSH_KEY root@$SERVER_IP 'docker ps'"
echo ""
echo "To view logs:"
echo "  ssh -i $SSH_KEY root@$SERVER_IP 'docker logs <service-name>'"