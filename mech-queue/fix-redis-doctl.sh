#!/bin/bash

# Fix exposed Redis using DigitalOcean CLI
# This script runs commands on the droplet remotely

DROPLET_IP="138.197.15.235"

echo "🚨 Fixing exposed Redis on droplet $DROPLET_IP..."

# Create a fix script to run on the droplet
cat > /tmp/fix-redis-remote.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting Redis security fix..."

# 1. Stop and disable Redis service
echo "Stopping Redis service..."
sudo systemctl stop redis 2>/dev/null || true
sudo systemctl stop redis-server 2>/dev/null || true
sudo systemctl disable redis 2>/dev/null || true
sudo systemctl disable redis-server 2>/dev/null || true

# 2. Kill any process on port 6379
echo "Killing processes on port 6379..."
sudo fuser -k 6379/tcp 2>/dev/null || true

# 3. Remove Redis packages
echo "Removing Redis packages..."
sudo apt-get remove -y redis-server redis-tools 2>/dev/null || true
sudo apt-get autoremove -y 2>/dev/null || true

# 4. Update firewall rules
echo "Updating firewall rules..."
sudo ufw deny 6379/tcp
sudo ufw deny 6379/udp
sudo ufw --force enable

# 5. Check if port is still open
echo "Verifying port 6379 is closed..."
if sudo netstat -tlnp | grep -q ":6379"; then
    echo "WARNING: Port 6379 is still open!"
    sudo netstat -tlnp | grep ":6379"
else
    echo "✅ Port 6379 is closed"
fi

# 6. Stop any Redis Docker containers
echo "Stopping Redis Docker containers..."
docker ps -a | grep -E "redis|valkey" | awk '{print $1}' | xargs -r docker stop 2>/dev/null || true
docker ps -a | grep -E "redis|valkey" | awk '{print $1}' | xargs -r docker rm 2>/dev/null || true

# 7. Restart queue service with proper configuration
echo "Checking queue service..."
if docker ps | grep -q queue-service; then
    echo "Queue service is running"
    docker logs --tail 10 queue-service
else
    echo "Queue service is not running. Starting it..."
    
    # Try to get Valkey credentials if doctl is available
    if command -v doctl &> /dev/null; then
        DB_INFO=$(doctl databases list --format Name,ID --no-header | grep "queue-valkey" || true)
        if [ -n "$DB_INFO" ]; then
            DB_ID=$(echo $DB_INFO | awk '{print $2}')
            VALKEY_HOST=$(doctl databases connection $DB_ID --format Host --no-header)
            VALKEY_PORT=$(doctl databases connection $DB_ID --format Port --no-header)
            VALKEY_PASSWORD=$(doctl databases connection $DB_ID --format Password --no-header)
            
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
        fi
    fi
fi

# 8. Final verification
echo ""
echo "=== FINAL STATUS ==="
echo "Firewall rules:"
sudo ufw status numbered | grep 6379 || echo "No rules for port 6379"
echo ""
echo "Open ports:"
sudo netstat -tlnp | grep -E ":6379|redis" || echo "✅ No Redis ports open"
echo ""
echo "Docker containers:"
docker ps | grep -E "redis|queue" || echo "No Redis containers running"
echo ""

# Test from localhost
if timeout 2 bash -c "echo > /dev/tcp/localhost/6379" 2>/dev/null; then
    echo "❌ WARNING: Port 6379 is still accessible locally!"
else
    echo "✅ Port 6379 is not accessible locally"
fi

echo ""
echo "✅ Security fix completed!"
echo ""
echo "IMPORTANT: Test from outside that port 6379 is closed:"
echo "telnet $DROPLET_IP 6379"
echo "(This should fail/timeout)"
EOF

# Copy and execute the script on the droplet
echo "Copying fix script to droplet..."
scp -o StrictHostKeyChecking=no /tmp/fix-redis-remote.sh root@$DROPLET_IP:/tmp/

echo "Executing fix on droplet..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP "bash /tmp/fix-redis-remote.sh"

# Clean up
rm /tmp/fix-redis-remote.sh

echo ""
echo "Testing if port 6379 is accessible from outside..."
if timeout 3 bash -c "echo > /dev/tcp/$DROPLET_IP/6379" 2>/dev/null; then
    echo "❌ CRITICAL: Port 6379 is still open!"
else
    echo "✅ SUCCESS: Port 6379 is not accessible from outside"
fi

echo ""
echo "Next steps:"
echo "1. Verify the fix worked by trying: telnet $DROPLET_IP 6379"
echo "2. Reply to DigitalOcean's ticket confirming the issue is resolved"
echo "3. Ensure your queue service is using DigitalOcean's managed Valkey database"