# AI Agent Deployment Reference

## Quick Command Reference

This document provides AI agents with structured, actionable information for deploying and managing Mech platform services.

## 🚀 Deployment Commands

### Standard Service Deployment
```bash
# Deploy any service (recommended method)
./deploy-service.sh SERVICE_NAME latest

# Available services:
# mech-queue, mech-llms, mech-storage, mech-indexer
# mech-sequences, mech-search, mech-reader, mech-memories
```

### Manual Deployment Steps
```bash
# 1. Build and push image
cd SERVICE_DIRECTORY
docker buildx build --platform linux/amd64 -t derivativelabs/SERVICE_NAME:latest --push .

# 2. Deploy to server
ssh -i ~/.ssh/vultr_mech_machines root@207.148.31.73 '
    docker pull derivativelabs/SERVICE_NAME:latest
    docker stop SERVICE_NAME || true
    docker rm SERVICE_NAME || true
    docker run -d --name SERVICE_NAME --network mech-network \
        -p PORT:PORT --env-file /opt/mech-services/SERVICE_NAME/.env \
        --restart unless-stopped derivativelabs/SERVICE_NAME:latest
'
```

## 🔧 Critical Infrastructure Commands

### UFW Firewall (MOST IMPORTANT)
```bash
# Essential firewall rules - ALWAYS configure these first
ssh root@207.148.31.73 '
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3001:3010/tcp
    ufw --force enable
    ufw status
'
```

### Docker Network Setup
```bash
# Create and verify mech-network
ssh root@207.148.31.73 '
    docker network create mech-network
    docker network ls | grep mech-network
'
```

### Nginx Configuration
```bash
# Create nginx config for new service
ssh root@207.148.31.73 'cat > /etc/nginx/sites-available/SERVICE.mech.is << EOF
server {
    listen 80;
    server_name SERVICE.mech.is;
    location / {
        proxy_pass http://localhost:PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/SERVICE.mech.is /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx'
```

## 📊 Service Configuration Matrix

| Service | Port | Domain | Key Environment Variables |
|---------|------|--------|---------------------------|
| mech-queue | 3002 | queue.mech.is | REDIS_HOST=redis |
| mech-llms | 3008 | llm.mech.is | OPENAI_API_KEY, ANTHROPIC_API_KEY |
| mech-storage | 3007 | storage.mech.is | R2_ACCESS_KEY, R2_SECRET_KEY |
| mech-indexer | 3005 | indexer.mech.is | GITHUB_TOKEN, OPENAI_API_KEY |
| mech-sequences | 3004 | sequences.mech.is | MONGODB_URI |
| mech-search | 3009 | search.mech.is | MONGODB_URI |
| mech-reader | 3001 | reader.mech.is | MONGODB_URI |
| mech-memories | 3010 | memories.mech.is | MONGODB_URI |

## 🏗️ Infrastructure Details

### Server Information
- **Production Server**: 207.148.31.73
- **SSH Key**: ~/.ssh/vultr_mech_machines
- **Docker Registry**: derivativelabs (Docker Hub)
- **Domain**: mech.is (managed via Cloudflare)

### Critical Configuration Files
```bash
# Service environments
/opt/mech-services/SERVICE_NAME/.env

# Nginx configurations
/etc/nginx/sites-available/SERVICE.mech.is

# Docker network
mech-network (must be used for all containers)
```

### Required Environment Variables Template
```bash
# Common variables for all services
NODE_ENV=production
PORT=SERVICE_PORT
MONGODB_URI=mongodb://mongodb:27017/mech
REDIS_HOST=redis
REDIS_PORT=6379

# Service-specific variables (add as needed)
OPENAI_API_KEY=sk-...          # For mech-llms, mech-indexer
ANTHROPIC_API_KEY=sk-ant-...   # For mech-llms
GITHUB_TOKEN=ghp_...           # For mech-indexer
R2_ACCESS_KEY=...              # For mech-storage
R2_SECRET_KEY=...              # For mech-storage
```

## 🚨 Common Failure Patterns & Quick Fixes

### Pattern 1: 522/524 Errors (Service Unreachable)
**Cause**: UFW firewall blocking ports
**Quick Fix**:
```bash
ssh root@207.148.31.73 'ufw allow 80/tcp && ufw allow 443/tcp && ufw reload'
```

### Pattern 2: Container Network Issues
**Cause**: Not using mech-network
**Quick Fix**:
```bash
ssh root@207.148.31.73 'docker network connect mech-network CONTAINER_NAME'
```

### Pattern 3: SSL/TLS Errors
**Cause**: Cloudflare SSL mode misconfiguration
**Quick Fix**: Set Cloudflare SSL mode to "Flexible"

### Pattern 4: Service Won't Start
**Cause**: Missing environment variables or port conflicts
**Quick Fix**:
```bash
# Check container logs
ssh root@207.148.31.73 'docker logs CONTAINER_NAME --tail 20'

# Check port conflicts
ssh root@207.148.31.73 'ss -tlnp | grep :PORT'
```

## 🔍 Diagnostic Commands

### Health Check All Services
```bash
for service in queue llm storage indexer sequences search reader memories; do
    echo -n "$service: "
    curl -s --max-time 3 https://$service.mech.is/health | jq -r '.status' 2>/dev/null || echo "FAILED"
done
```

### Container Status Check
```bash
ssh root@207.148.31.73 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mech-'
```

### Network Connectivity Test
```bash
# Test service-to-service communication
ssh root@207.148.31.73 'docker exec mech-llms curl -f http://mech-queue:3002/health'
```

### Log Inspection
```bash
# Check recent logs for errors
ssh root@207.148.31.73 'docker logs SERVICE_NAME --tail 50 | grep -i error'

# Monitor logs in real-time
ssh root@207.148.31.73 'docker logs -f SERVICE_NAME'
```

## 📝 New Service Deployment Checklist

### Pre-Deployment
- [ ] Service code ready with health endpoint
- [ ] Dockerfile created and tested
- [ ] Port allocated (check service matrix above)
- [ ] Environment variables documented

### Infrastructure Setup
- [ ] UFW firewall rule added: `ufw allow PORT/tcp`
- [ ] Nginx configuration created
- [ ] DNS record added in Cloudflare
- [ ] SSL mode set to "Flexible"

### Deployment
- [ ] Docker image built: `docker buildx build --platform linux/amd64 -t derivativelabs/SERVICE:latest --push .`
- [ ] Container deployed with mech-network
- [ ] Environment file created: `/opt/mech-services/SERVICE/.env`
- [ ] Health check verified: `curl https://SERVICE.mech.is/health`

### Post-Deployment
- [ ] Update deploy-service.sh script
- [ ] Update troubleshoot-service.sh script
- [ ] Update monitoring scripts
- [ ] Document service-specific configuration

## 🛠️ Automation Scripts

### Quick Service Deployment Script
```bash
#!/bin/bash
# quick-deploy.sh SERVICE_NAME PORT

SERVICE_NAME=$1
PORT=$2

if [[ -z "$SERVICE_NAME" || -z "$PORT" ]]; then
    echo "Usage: $0 <service-name> <port>"
    exit 1
fi

# Build and push
cd $SERVICE_NAME
docker buildx build --platform linux/amd64 -t derivativelabs/$SERVICE_NAME:latest --push .

# Deploy
ssh root@207.148.31.73 << EOF
    # Add firewall rule
    ufw allow $PORT/tcp
    
    # Pull and run
    docker pull derivativelabs/$SERVICE_NAME:latest
    docker stop $SERVICE_NAME || true
    docker rm $SERVICE_NAME || true
    docker run -d --name $SERVICE_NAME --network mech-network \
        -p $PORT:$PORT --restart unless-stopped \
        derivativelabs/$SERVICE_NAME:latest
    
    # Create nginx config
    cat > /etc/nginx/sites-available/$SERVICE_NAME.mech.is << 'NGINX_EOF'
server {
    listen 80;
    server_name $SERVICE_NAME.mech.is;
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX_EOF
    
    ln -sf /etc/nginx/sites-available/$SERVICE_NAME.mech.is /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
EOF

echo "✅ Service deployed: https://$SERVICE_NAME.mech.is/health"
```

### Health Check Script
```bash
#!/bin/bash
# health-check.sh

echo "=== MECH PLATFORM HEALTH CHECK ==="
echo "Timestamp: $(date)"

services=("queue:3002" "llm:3008" "storage:3007" "indexer:3005" "sequences:3004" "search:3009" "reader:3001" "memories:3010")

for service_port in "${services[@]}"; do
    service=${service_port%:*}
    port=${service_port#*:}
    
    # Internal check
    internal=$(ssh root@207.148.31.73 "curl -s --max-time 3 http://localhost:$port/health | jq -r '.status' 2>/dev/null" || echo "failed")
    
    # External check
    external=$(curl -s --max-time 3 https://$service.mech.is/health | jq -r '.status' 2>/dev/null || echo "failed")
    
    echo "$service: internal=$internal external=$external"
done
```

## 🔄 Rollback Procedures

### Quick Service Rollback
```bash
# Rollback to previous version
ssh root@207.148.31.73 '
    docker stop SERVICE_NAME
    docker run -d --name SERVICE_NAME-new --network mech-network \
        -p PORT:PORT --env-file /opt/mech-services/SERVICE_NAME/.env \
        --restart unless-stopped derivativelabs/SERVICE_NAME:PREVIOUS_TAG
    docker rm SERVICE_NAME
    docker rename SERVICE_NAME-new SERVICE_NAME
'
```

### Emergency Service Restart
```bash
# Restart all mech services
ssh root@207.148.31.73 'docker restart $(docker ps --format "{{.Names}}" | grep mech-)'

# Restart specific service
ssh root@207.148.31.73 'docker restart SERVICE_NAME'
```

## 📈 Monitoring Commands

### Resource Usage
```bash
# Check container resource usage
ssh root@207.148.31.73 'docker stats --no-stream'

# Check system resources
ssh root@207.148.31.73 'free -h && df -h'
```

### Log Analysis
```bash
# Find recent errors across all services
ssh root@207.148.31.73 '
    for container in $(docker ps --format "{{.Names}}" | grep mech-); do
        echo "=== $container ==="
        docker logs $container --since="1h" 2>&1 | grep -i error | tail -3
    done
'
```

### Performance Monitoring
```bash
# Test response times
for service in queue llm storage indexer sequences search reader memories; do
    echo -n "$service: "
    curl -w "%{time_total}s\n" -s -o /dev/null --max-time 10 https://$service.mech.is/health
done
```

## 🔐 Security Commands

### Certificate Management
```bash
# Check SSL certificate status
for service in queue llm storage indexer sequences search reader memories; do
    echo "$service:"
    echo | openssl s_client -connect $service.mech.is:443 -servername $service.mech.is 2>/dev/null | openssl x509 -noout -dates
done
```

### Access Control
```bash
# Review nginx access logs
ssh root@207.148.31.73 'tail -f /var/log/nginx/access.log | grep -E "(POST|PUT|DELETE)"'

# Check for suspicious activity
ssh root@207.148.31.73 'journalctl -u ssh --since="1 hour ago" | grep -i failed'
```

## 🎯 Success Verification

### Deployment Success Criteria
A successful deployment should have:
- ✅ Container running: `docker ps | grep SERVICE_NAME`
- ✅ Internal health: `curl http://localhost:PORT/health`
- ✅ External access: `curl https://SERVICE.mech.is/health`
- ✅ No errors in logs: `docker logs SERVICE_NAME | grep -i error`
- ✅ Service communication: `docker exec SERVICE_NAME curl http://other-service:PORT/health`

### Platform Health Indicators
- All 8 services responding to health checks
- External HTTPS access working for all domains
- Service-to-service communication functional
- No critical errors in recent logs
- System resources within normal limits

## 🆘 Emergency Procedures

### Total Platform Recovery
```bash
# 1. Verify infrastructure
ssh root@207.148.31.73 '
    ufw allow 80/tcp && ufw allow 443/tcp && ufw reload
    docker network create mech-network || true
    systemctl restart nginx
'

# 2. Restart all services
ssh root@207.148.31.73 'docker restart $(docker ps -q)'

# 3. Verify recovery
./health-check.sh
```

### Individual Service Recovery
```bash
# Stop, remove, and redeploy service
ssh root@207.148.31.73 '
    docker stop SERVICE_NAME
    docker rm SERVICE_NAME
    docker pull derivativelabs/SERVICE_NAME:latest
    docker run -d --name SERVICE_NAME --network mech-network \
        -p PORT:PORT --env-file /opt/mech-services/SERVICE_NAME/.env \
        --restart unless-stopped derivativelabs/SERVICE_NAME:latest
'
```

This reference provides AI agents with all necessary commands and procedures for successful Mech platform deployment and management.