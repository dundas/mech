# Complete Mech Service Deployment Workflow

## Overview
This document provides the complete workflow for deploying Mech services from scratch, including droplet creation, service deployment, and registry management.

## Phase 1: Infrastructure Setup

### 1.1 Create a New Droplet (If Needed)
```bash
# Using the standardized deployment script
./deploy-mech-service.sh mech-servicename --create-droplet

# Or manually
doctl compute droplet create mech-servicename \
  --region nyc3 \
  --size s-1vcpu-1gb \
  --image ubuntu-22-04-x64 \
  --ssh-keys $(doctl compute ssh-key list --format ID --no-header)
```

### 1.2 Configure Droplet
```bash
# The deploy-mech-service.sh script handles this automatically
# Including: Docker, nginx, SSL certificates
```

## Phase 2: Service Deployment

### 2.1 Using Registry (Traditional Method)
```bash
# If you have a container registry configured
./deploy-mech-service.sh mech-servicename --domain service.mech.is
```

### 2.2 Using Local Build (New Method)
```bash
# For quick deployments without registry
./deploy-local-docker.sh mech-servicename DROPLET_IP PORT
```

## Phase 3: Service Configuration

### 3.1 Environment Variables
Each service needs proper environment configuration:

```bash
# SSH into droplet
ssh root@DROPLET_IP

# Edit environment file
nano /opt/mech-service/.env

# Add required variables (see AGENT_DEPLOYMENT_GUIDE.md for specifics)
```

### 3.2 Nginx Configuration
Already handled by deploy-mech-service.sh, but can be customized:

```bash
# Edit nginx config if needed
ssh root@DROPLET_IP
nano /etc/nginx/sites-available/service.mech.is
nginx -t && systemctl reload nginx
```

## Phase 4: Registry Management

### 4.1 Register New Service
```bash
# Using the registration script
cd mech-registry
npx tsx scripts/register-services.ts

# Or manually via API
curl -X POST http://localhost:3020/api/services \
  -H "Content-Type: application/json" \
  -d @service-config.json
```

### 4.2 Update Service Status
```bash
# After deployment, update the registry
curl -X PUT http://localhost:3020/api/services/mech-servicename \
  -H "Content-Type: application/json" \
  -d '{
    "status": {
      "health": "healthy",
      "instances": [{
        "id": "prod-1",
        "environment": "production",
        "url": "https://service.mech.is",
        "status": "running",
        "deployedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }]
    }
  }'
```

## Complete Example: Deploying a New Service

Let's deploy mech-sequences as a complete example:

### Step 1: Create Service Configuration
```yaml
# service-configs/mech-sequences.yaml
name: mech-sequences
version: 1.0.0
description: Workflow orchestration service
runtime:
  port: 3004
  healthCheck: /health
  environment:
    NODE_ENV: production
    PORT: "3004"
    MONGODB_URI: "mongodb+srv://..."
    REDIS_URL: "redis://..."
deployment:
  size: s-1vcpu-1gb
  region: nyc3
  tags:
    - sequences
    - workflow
nginx:
  enabled: true
  domain: sequences.mech.is
  ssl: true
```

### Step 2: Create and Configure Droplet
```bash
# This creates droplet and sets up everything
./deploy-mech-service.sh mech-sequences --create-droplet --domain sequences.mech.is
```

### Step 3: Build and Deploy Service
```bash
# Build locally and deploy
./deploy-local-docker.sh mech-sequences NEW_DROPLET_IP 3004
```

### Step 4: Register in Mech Registry
```bash
# Add to registry
curl -X POST http://localhost:3020/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "id": "mech-sequences",
    "name": "mech-sequences",
    "description": "Workflow orchestration service",
    "version": "1.0.0",
    "repository": {
      "url": "https://github.com/mech-ai/mech-sequences"
    },
    "docker": {
      "registry": "local",
      "image": "mech-sequences",
      "tag": "latest"
    },
    "configuration": {
      "port": 3004,
      "healthCheck": "/health",
      "environment": {
        "required": ["MONGODB_URI", "REDIS_URL"],
        "optional": ["LOG_LEVEL"]
      }
    },
    "deployment": {
      "minResources": {
        "size": "s-1vcpu-1gb",
        "memory": "1GB",
        "cpu": "1"
      },
      "domains": ["sequences.mech.is"],
      "nginx": {
        "enabled": true,
        "ssl": true
      }
    }
  }'
```

### Step 5: Verify Deployment
```bash
# Check health
curl https://sequences.mech.is/health

# Check registry status
curl http://localhost:3020/api/services/mech-sequences

# Monitor logs
ssh root@DROPLET_IP 'docker logs -f mech-sequences'
```

## Deployment Decision Tree

```
Need to deploy a service?
│
├─ Have container registry access?
│  ├─ YES → Use deploy-mech-service.sh
│  └─ NO  → Use deploy-local-docker.sh
│
├─ Need new droplet?
│  ├─ YES → deploy-mech-service.sh --create-droplet
│  └─ NO  → Use existing droplet IP
│
└─ Service type?
   ├─ Stateless (API) → Single instance
   ├─ Stateful (DB) → Consider data persistence
   └─ Worker → May need Redis/Queue access
```

## Best Practices Summary

1. **Always Test Locally First**
   ```bash
   docker run --rm -p 3000:3000 service:latest
   ```

2. **Use Standardized Scripts**
   - `deploy-mech-service.sh` for full infrastructure
   - `deploy-local-docker.sh` for quick deployments

3. **Keep Registry Updated**
   - Register all services
   - Update status after deployments
   - Monitor health checks

4. **Document Everything**
   - Service configurations
   - Environment variables
   - Deployment decisions

5. **Monitor After Deployment**
   - Check health endpoints
   - Review logs
   - Verify public access

## Quick Commands Reference

```bash
# Deploy with registry
./deploy-mech-service.sh SERVICE_NAME --domain DOMAIN

# Deploy without registry
./deploy-local-docker.sh SERVICE_NAME IP PORT

# Check service health
curl https://SERVICE.mech.is/health

# View logs
ssh root@IP 'docker logs SERVICE_NAME'

# Restart service
ssh root@IP 'docker restart SERVICE_NAME'

# Update registry
curl -X PUT http://localhost:3020/api/services/SERVICE_NAME ...
```

## Troubleshooting Checklist

- [ ] Service running? `docker ps`
- [ ] Logs clean? `docker logs SERVICE_NAME`
- [ ] Port accessible? `curl IP:PORT/health`
- [ ] Nginx configured? `nginx -t`
- [ ] SSL working? `curl https://DOMAIN`
- [ ] Registry updated? Check Mech Registry
- [ ] Environment correct? Check `.env` file