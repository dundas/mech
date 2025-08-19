#!/usr/bin/env bash

# Deploy all services to production Vultr server with proper environment variables
set -e

SERVER_IP="207.148.31.73"
SSH_KEY="~/.ssh/vultr_mech_machines"

echo "🚀 Deploying Mech Services to Production (Fixed)"
echo "=============================================="
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

# Deploy service with proper environment
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
    
    # Deploy on server with proper env vars
    echo "🚀 Deploying on server..."
    ssh -i $SSH_KEY "root@$SERVER_IP" << EOF
# Load image
docker load < /tmp/$service.tar.gz
rm -f /tmp/$service.tar.gz

# Stop existing container
docker stop $service 2>/dev/null || true
docker rm $service 2>/dev/null || true

# Create service-specific environment file
case "$service" in
    "mech-storage")
        cat > /root/.env.$service << 'ENVEOF'
NODE_ENV=production
PORT=$port
MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/
MONGODB_DB_NAME=mechDB
R2_ACCOUNT_ID=52530a420a8dc50c739929f163c73623
R2_ACCESS_KEY_ID=f82b7147f0b14b956f60802f67c17837
R2_SECRET_ACCESS_KEY=a0fc44c6b23b96d2a10b5f07e5c0f7f3a79bbffbb43b5a72a3c77baa87dc5f09
R2_ENDPOINT=https://52530a420a8dc50c739929f163c73623.r2.cloudflarestorage.com
ENABLE_API_KEY_AUTH=false
SERVICE_URL=https://storage.mech.is
PUBLIC_URL=https://storage.mech.is
MAX_FILE_SIZE=104857600
LOG_LEVEL=info
CORS_ORIGIN=https://storage.mech.is,https://api.mech.is
ENVEOF
        ;;
    "mech-llms")
        cat > /root/.env.$service << 'ENVEOF'
NODE_ENV=production
PORT=$port
MONGO_CONN=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/?retryWrites=true&w=majority&appName=MAIN
MONGO_DB_NAME=mechLLMsDB
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_api_key_here}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_anthropic_api_key_here}
GOOGLE_API_KEY=AIza-placeholder
TOGETHER_API_KEY=placeholder
REDIS_URL=${REDIS_URL:-redis://default:your_redis_password@your_redis_host:25061}
CACHE_TTL=3600
CORS_ORIGIN=https://llms.mech.is,https://api.mech.is
ENVEOF
        ;;
    "mech-reader")
        cat > /root/.env.$service << 'ENVEOF'
NODE_ENV=production
PORT=$port
MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_api_key_here}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_anthropic_api_key_here}
ENABLE_AUTH=false
CORS_ORIGIN=https://reader.mech.is,https://api.mech.is
LOG_LEVEL=info
ENVEOF
        ;;
    "mech-search")
        cat > /root/.env.$service << 'ENVEOF'
NODE_ENV=production
PORT=$port
MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_api_key_here}
CORS_ORIGIN=https://search.mech.is,https://api.mech.is
LOG_LEVEL=info
ENVEOF
        ;;
    "mech-sequences")
        cat > /root/.env.$service << 'ENVEOF'
NODE_ENV=production
PORT=$port
MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_api_key_here}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_anthropic_api_key_here}
CORS_ORIGIN=https://sequences.mech.is,https://api.mech.is
LOG_LEVEL=info
SERVICE_URL=https://sequences.mech.is
STORAGE_SERVICE_URL=http://mech-storage:3007
LLM_SERVICE_URL=http://mech-llms:3008
QUEUE_SERVICE_URL=http://mech-queue:3003
ENVEOF
        ;;
    *)
        # Default env for other services
        cat > /root/.env.$service << 'ENVEOF'
NODE_ENV=production
PORT=$port
MONGODB_URI=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_api_key_here}
CORS_ORIGIN=https://${service#mech-}.mech.is,https://api.mech.is
LOG_LEVEL=info
QUEUE_SERVICE_URL=http://mech-queue:3003
STORAGE_SERVICE_URL=http://mech-storage:3007
LLM_SERVICE_URL=http://mech-llms:3008
ENVEOF
        ;;
esac

# Run container
docker run -d \\
  --name $service \\
  --restart unless-stopped \\
  -p $port:$port \\
  --env-file /root/.env.$service \\
  --network mech-network \\
  $service:latest

# Wait and check
sleep 10
if docker ps | grep -q $service; then
  echo "✅ $service is running"
  docker logs $service --tail 5
else
  echo "❌ $service failed to start"
  docker logs $service --tail 20
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