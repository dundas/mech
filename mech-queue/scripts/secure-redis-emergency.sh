#!/bin/bash

# Emergency script to secure exposed Redis on DigitalOcean droplet
# This addresses the security issue reported by DigitalOcean

echo "🚨 EMERGENCY: Securing exposed Redis instance..."

# First, stop any exposed Redis service
echo "Stopping exposed Redis service..."
sudo systemctl stop redis 2>/dev/null || true
sudo systemctl disable redis 2>/dev/null || true

# Kill any Redis processes on port 6379
sudo kill $(sudo lsof -t -i:6379) 2>/dev/null || true

# Remove any standalone Redis installation
echo "Removing standalone Redis if present..."
sudo apt-get remove -y redis-server redis-tools 2>/dev/null || true

# Update firewall rules to block Redis port
echo "Securing firewall..."
sudo ufw deny 6379/tcp
sudo ufw --force enable

# Ensure we're only using containerized services
echo "Checking Docker containers..."
docker ps -a | grep -E "redis|valkey"

# Stop any Redis/Valkey containers that might be exposing port 6379
docker ps -a | grep -E "redis|valkey" | awk '{print $1}' | xargs -r docker stop
docker ps -a | grep -E "redis|valkey" | awk '{print $1}' | xargs -r docker rm

# Restart queue service with proper configuration
echo "Restarting queue service with secure configuration..."

# Get Valkey credentials
DB_INFO=$(doctl databases list --format Name,ID --no-header | grep "queue-valkey" || true)
if [ -n "$DB_INFO" ]; then
    DB_ID=$(echo $DB_INFO | awk '{print $2}')
    VALKEY_HOST=$(doctl databases connection $DB_ID --format Host --no-header)
    VALKEY_PORT=$(doctl databases connection $DB_ID --format Port --no-header)
    VALKEY_PASSWORD=$(doctl databases connection $DB_ID --format Password --no-header)
    
    # Stop existing queue service
    docker stop queue-service 2>/dev/null || true
    docker rm queue-service 2>/dev/null || true
    
    # Run queue service with Valkey (NOT exposing Redis)
    docker run -d \
        --name queue-service \
        --restart unless-stopped \
        -p 3003:3003 \
        -p 3004:3004 \
        -e NODE_ENV=production \
        -e REDIS_HOST="$VALKEY_HOST" \
        -e REDIS_PORT="$VALKEY_PORT" \
        -e REDIS_PASSWORD="$VALKEY_PASSWORD" \
        -e REDIS_DB=0 \
        -e MONGODB_URI="mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/queue?retryWrites=true&w=majority&appName=MAIN" \
        -e MASTER_API_KEY="${MASTER_API_KEY:-secure-key-change-this}" \
        -e ENABLE_API_KEY_AUTH=true \
        -e ENABLE_PROMETHEUS_METRICS=true \
        -e LOG_LEVEL=info \
        registry.digitalocean.com/queue-service-registry/queue-service:latest
else
    echo "❌ Valkey database not found. Please set up managed database."
fi

# Verify no Redis is exposed
echo ""
echo "Verifying security..."
echo "Checking for exposed ports:"
sudo netstat -tlnp | grep -E ":6379|redis" || echo "✅ No Redis exposed on port 6379"

echo ""
echo "Current firewall status:"
sudo ufw status numbered

echo ""
echo "✅ Emergency security fix complete!"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Verify no Redis is accessible: telnet 138.197.15.235 6379 (should fail)"
echo "2. Respond to DigitalOcean ticket confirming the issue is fixed"
echo "3. Use only DigitalOcean's managed Valkey database"
echo "4. Never run Redis directly on the droplet"