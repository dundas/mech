#!/bin/bash

# Deploy the updated indexer service to production
set -e

echo "🚀 Deploying updated indexer service to production..."

# Try multiple connection methods
DROPLET_IPS=("138.197.15.235" "queue.mech.is" "indexer.mech.is")
DROPLET_USER="root"
SUCCESS=false

for HOST in "${DROPLET_IPS[@]}"; do
    echo "🔍 Trying to connect to $HOST..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $DROPLET_USER@$HOST "echo 'Connection successful'" 2>/dev/null; then
        echo "✅ Connected to $HOST"
        
        # Execute deployment commands
        ssh $DROPLET_USER@$HOST << 'EOF'
#!/bin/bash
set -e

echo "🔄 Updating indexer service on production..."

# Navigate to service directory
cd /opt/mech-services

# Check current status
echo "📋 Current service status:"
docker-compose ps

# Pull latest image
echo "📥 Pulling latest image..."
docker-compose pull indexer-service

# Restart the service
echo "🔄 Restarting indexer service..."
docker-compose up -d indexer-service

# Wait for service to be ready
echo "⏳ Waiting for service to start..."
sleep 20

# Test the service
echo "🧪 Testing updated service..."
if curl -f -s http://localhost:3005/health > /dev/null; then
    echo "✅ Service is responding"
else
    echo "❌ Service health check failed"
    docker-compose logs --tail=20 indexer-service
    exit 1
fi

# Test base API
if curl -f -s http://localhost:3005/api > /dev/null; then
    echo "✅ Base API is working"
else
    echo "❌ Base API test failed"
    docker-compose logs --tail=30 indexer-service
fi

# Test explain endpoint
if curl -f -s http://localhost:3005/api/explain > /dev/null; then
    echo "✅ Explain endpoint is working!"
    echo "📋 Explain endpoint response:"
    curl -s http://localhost:3005/api/explain | head -20
else
    echo "⚠️  Explain endpoint not responding yet"
    echo "📋 Service logs:"
    docker-compose logs --tail=50 indexer-service
fi

echo "✅ Deployment completed successfully!"
EOF
        
        SUCCESS=true
        break
    else
        echo "❌ Failed to connect to $HOST"
    fi
done

if [ "$SUCCESS" = false ]; then
    echo "❌ Could not connect to any server. Manual deployment required:"
    echo ""
    echo "Manual steps:"
    echo "1. SSH to the server: ssh root@queue.mech.is (or IP 138.197.15.235)"
    echo "2. Navigate to: cd /opt/mech-services"
    echo "3. Pull image: docker-compose pull indexer-service"
    echo "4. Restart: docker-compose up -d indexer-service"
    echo ""nnection
    echo "The Docker image is ready in the registry:"
    echo "registry.digitalocean.com/queue-service-registry/mech-indexer:latest"
    exit 1
fi

echo "🎉 Production deployment completed!"