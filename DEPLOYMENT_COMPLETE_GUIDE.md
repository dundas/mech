# Mech Platform - Complete Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying and managing the Mech platform based on our extensive deployment experience. It addresses all critical issues encountered and provides proven solutions for successful deployments.

## 🚨 Critical Issues & Solutions

### 1. UFW Firewall (Most Common Failure Point)
**Problem**: Services deployed but not accessible (522/524 errors)
**Solution**: Configure UFW firewall rules

```bash
# Essential firewall rules - MUST BE CONFIGURED
sudo ufw allow 22/tcp   # SSH access
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3001:3010/tcp  # Service ports
sudo ufw allow 8888/tcp # Additional services
sudo ufw reload

# Verify rules
sudo ufw status numbered
```

### 2. Docker Network Configuration
**Problem**: Services cannot communicate with each other
**Solution**: Use mech-network for all containers

```bash
# Create network if it doesn't exist
docker network create mech-network

# Always use --network mech-network in docker run commands
docker run -d --name service-name --network mech-network ...
```

### 3. Environment Variable Configuration
**Problem**: Services fail to start due to incorrect hostnames
**Solution**: Use container names instead of localhost

```bash
# WRONG
MONGODB_URI=mongodb://localhost:27017/mech
REDIS_HOST=localhost

# CORRECT
MONGODB_URI=mongodb://mongodb:27017/mech
REDIS_HOST=redis
```

### 4. Cloudflare SSL Configuration
**Problem**: SSL/TLS errors with self-signed certificates
**Solution**: Set SSL mode to "Flexible"

1. Go to Cloudflare Dashboard → SSL/TLS → Overview
2. Set SSL mode to "Flexible" 
3. Wait for propagation (1-5 minutes)

## Deployment Pipeline

### Phase 1: Server Preparation

#### 1.1 Initial Server Setup
```bash
# Connect to server
ssh -i ~/.ssh/vultr_mech_machines root@207.148.31.73

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install nginx
apt install nginx -y

# Configure UFW (CRITICAL)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001:3010/tcp
ufw allow 8888/tcp
ufw --force enable
```

#### 1.2 Docker Network Setup
```bash
# Create mech network
docker network create mech-network

# Verify network
docker network ls | grep mech-network
```

#### 1.3 Directory Structure
```bash
# Create service directories
mkdir -p /opt/mech-services
cd /opt/mech-services

# Create individual service directories
for service in queue llms storage indexer sequences search reader memories; do
    mkdir -p mech-$service
done
```

### Phase 2: Service Deployment

#### 2.1 Using Automated Deployment Script
```bash
# Make deployment script executable
chmod +x ./deploy-service.sh

# Deploy a service
./deploy-service.sh mech-llms latest

# Deploy multiple services
for service in mech-queue mech-llms mech-storage mech-indexer; do
    ./deploy-service.sh $service latest
done
```

#### 2.2 Manual Deployment Process
```bash
# Example: Deploy mech-llms manually

# 1. Build and push image
cd mech-llms
docker buildx build --platform linux/amd64 -t derivativelabs/mech-llms:latest --push .

# 2. Deploy to server
ssh root@207.148.31.73 '
    # Pull image
    docker pull derivativelabs/mech-llms:latest
    
    # Stop existing container
    docker stop mech-llms || true
    docker rm mech-llms || true
    
    # Create environment file
    cat > /opt/mech-services/mech-llms/.env << EOF
NODE_ENV=production
PORT=3008
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
MONGODB_URI=mongodb://mongodb:27017/mech
REDIS_HOST=redis
EOF
    
    # Start container
    docker run -d \
        --name mech-llms \
        --network mech-network \
        -p 3008:3008 \
        --env-file /opt/mech-services/mech-llms/.env \
        --restart unless-stopped \
        --health-cmd "curl -f http://localhost:3008/health || exit 1" \
        --health-interval 30s \
        derivativelabs/mech-llms:latest
'
```

### Phase 3: Nginx Configuration

#### 3.1 Service Proxy Configuration
```nginx
# /etc/nginx/sites-available/llm.mech.is
server {
    listen 80;
    server_name llm.mech.is;
    
    # Cloudflare real IP
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    real_ip_header CF-Connecting-IP;
    
    location / {
        proxy_pass http://localhost:3008;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Handle WebSocket connections
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

#### 3.2 Enable Site
```bash
# Link configuration
ln -s /etc/nginx/sites-available/llm.mech.is /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### Phase 4: DNS Configuration

#### 4.1 Cloudflare DNS Records
Add A records in Cloudflare Dashboard (mech.is domain):

| Subdomain | Target IP | Proxied |
|-----------|----------|---------|
| queue | 207.148.31.73 | Yes |
| llm | 207.148.31.73 | Yes |
| storage | 207.148.31.73 | Yes |
| indexer | 207.148.31.73 | Yes |
| sequences | 207.148.31.73 | Yes |
| search | 207.148.31.73 | Yes |
| reader | 207.148.31.73 | Yes |
| memories | 207.148.31.73 | Yes |

#### 4.2 SSL Configuration
1. Go to Cloudflare → SSL/TLS → Overview
2. Set SSL mode to **"Flexible"**
3. Enable "Always Use HTTPS"

## Service Port Mapping

| Service | Port | Domain | Purpose |
|---------|------|--------|---------|
| mech-queue | 3002 | queue.mech.is | Task processing |
| mech-llms | 3008 | llm.mech.is | AI model integrations |
| mech-storage | 3007 | storage.mech.is | File storage |
| mech-indexer | 3005 | indexer.mech.is | Code indexing |
| mech-sequences | 3004 | sequences.mech.is | Workflow orchestration |
| mech-search | 3009 | search.mech.is | Search functionality |
| mech-reader | 3001 | reader.mech.is | Document processing |
| mech-memories | 3010 | memories.mech.is | Agent memory |

## Environment Variables by Service

### mech-queue
```bash
NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb://mongodb:27017/mech
REDIS_HOST=redis
REDIS_PORT=6379
```

### mech-llms
```bash
NODE_ENV=production
PORT=3008
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MONGODB_URI=mongodb://mongodb:27017/mech
```

### mech-storage
```bash
NODE_ENV=production
PORT=3007
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET_NAME=mech-storage
```

### mech-indexer
```bash
NODE_ENV=production
PORT=3005
GITHUB_TOKEN=ghp_...
OPENAI_API_KEY=sk-...
MONGODB_URI=mongodb://mongodb:27017/mech
```

## Verification Commands

### Health Checks
```bash
# Internal health checks
curl http://localhost:3008/health
curl http://localhost:3002/health
curl http://localhost:3007/health

# External access verification
curl https://llm.mech.is/health
curl https://queue.mech.is/health
curl https://storage.mech.is/health
```

### Container Status
```bash
# List running containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check specific service
docker logs mech-llms --tail 50

# Monitor resource usage
docker stats --no-stream
```

### Network Connectivity
```bash
# Test service-to-service communication
docker exec mech-llms curl -f http://mech-queue:3002/health

# Test DNS resolution
docker exec mech-llms nslookup mech-queue
```

## Common Deployment Patterns

### 1. Standard Service Deployment
```bash
# Build → Push → Deploy pattern
cd service-directory
docker buildx build --platform linux/amd64 -t derivativelabs/service:latest --push .
./deploy-service.sh service latest
```

### 2. Rapid Development Deployment
```bash
# Local build → direct transfer
cd service-directory
docker build -t service:latest .
docker save service:latest | ssh root@server 'docker load'
# Then deploy locally loaded image
```

### 3. Rollback Deployment
```bash
# Quick rollback to previous version
docker stop service-name
docker run -d --name service-name ... derivativelabs/service:previous-tag
```

## Monitoring & Maintenance

### Log Management
```bash
# View logs for all services
for service in mech-queue mech-llms mech-storage; do
    echo "=== $service ==="
    docker logs $service --tail 10
done

# Follow logs in real-time
docker logs -f mech-llms
```

### Health Monitoring
```bash
# Create health check script
cat > /opt/mech-services/health-check.sh << 'EOF'
#!/bin/bash
for service in queue llm storage indexer sequences search reader memories; do
    status=$(curl -s https://$service.mech.is/health | jq -r '.status' 2>/dev/null || echo "failed")
    echo "$service: $status"
done
EOF

chmod +x /opt/mech-services/health-check.sh
```

### Backup Procedures
```bash
# Backup environment files
tar -czf mech-env-backup-$(date +%Y%m%d).tar.gz /opt/mech-services/*/

# Backup container images
docker save $(docker images --format "{{.Repository}}:{{.Tag}}" | grep mech-) > mech-images-backup.tar
```

## Security Considerations

### 1. Firewall Configuration
- **Essential**: Configure UFW firewall rules
- **Principle**: Only open required ports
- **Monitoring**: Regular firewall status checks

### 2. Environment Variables
- **Secrets**: Never commit API keys to code
- **Storage**: Use .env files on server only
- **Rotation**: Regular credential rotation

### 3. Container Security
- **Images**: Use official base images
- **Updates**: Regular security updates
- **Scanning**: Image vulnerability scanning

## Troubleshooting Quick Reference

### Service Not Accessible (522/524 Errors)
1. Check UFW firewall rules
2. Verify container is running
3. Test internal health endpoint
4. Check nginx configuration
5. Verify DNS records

### Container Won't Start
1. Check environment variables
2. Review docker logs
3. Verify image exists
4. Check port conflicts
5. Validate Docker network

### Service-to-Service Communication Issues
1. Verify mech-network usage
2. Check hostname resolution
3. Test network connectivity
4. Review container names

## Success Metrics

A successful deployment should have:
- ✅ All containers running and healthy
- ✅ Internal health endpoints responding
- ✅ External HTTPS access working
- ✅ Service-to-service communication functional
- ✅ Logs showing no critical errors
- ✅ Cloudflare proxy working correctly

## Next Steps

After successful deployment:
1. Set up monitoring and alerting
2. Configure log aggregation
3. Implement backup procedures
4. Document service-specific configurations
5. Create runbooks for common operations

## Contact & Support

For issues with this deployment process:
- Check the troubleshooting guide
- Review service logs
- Verify configuration files
- Test network connectivity

This guide represents battle-tested procedures that have resolved the most common deployment issues encountered with the Mech platform.