# New Service Onboarding Playbook

## Overview

This playbook provides a complete step-by-step process for adding a new service to the Mech platform. It covers everything from initial service creation to production deployment and monitoring.

## Prerequisites

Before starting, ensure you have:
- [ ] Access to the production server (207.148.31.73)
- [ ] SSH key configured (~/.ssh/vultr_mech_machines)
- [ ] Docker Hub credentials in `.env` file
- [ ] Cloudflare access for DNS configuration
- [ ] Basic infrastructure already set up (see INFRASTRUCTURE_SETUP.md)

## Phase 1: Service Preparation

### Step 1.1: Service Analysis
Before adding a new service, analyze its requirements:

```bash
# Questions to answer:
# - What port will the service use?
# - What environment variables are required?
# - What external dependencies does it have?
# - Does it need persistent storage?
# - What are the health check endpoints?
```

### Step 1.2: Port Allocation
Check the current port mapping and assign a new port:

| Service | Port | Status |
|---------|------|--------|
| mech-reader | 3001 | ✅ Used |
| mech-queue | 3002 | ✅ Used |
| mech-sequences | 3004 | ✅ Used |
| mech-indexer | 3005 | ✅ Used |
| mech-storage | 3007 | ✅ Used |
| mech-llms | 3008 | ✅ Used |
| mech-search | 3009 | ✅ Used |
| mech-memories | 3010 | ✅ Used |
| **new-service** | **3011** | 🆕 Available |

### Step 1.3: Service Directory Setup
```bash
# Create service directory structure
mkdir -p mech-new-service/{src,dist,tests,docs}
cd mech-new-service

# Create essential files
touch Dockerfile
touch package.json
touch .dockerignore
touch README.md
```

## Phase 2: Service Development

### Step 2.1: Dockerfile Creation
Create a production-ready Dockerfile:

```dockerfile
# mech-new-service/Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001
USER nodeuser

# Expose port
EXPOSE 3011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3011/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

### Step 2.2: Package.json Configuration
```json
{
  "name": "mech-new-service",
  "version": "1.0.0",
  "description": "Description of the new service",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0"
  }
}
```

### Step 2.3: Basic Service Implementation
```typescript
// src/index.ts
import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());

// Health check endpoint (REQUIRED)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'mech-new-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Service-specific endpoints
app.get('/api/status', (req, res) => {
  res.json({ message: 'Service is running' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Service running on port ${port}`);
});
```

### Step 2.4: Environment Configuration
```bash
# Create .env.example
cat > .env.example << 'EOF'
NODE_ENV=production
PORT=3011
LOG_LEVEL=info

# Database connections
MONGODB_URI=mongodb://mongodb:27017/mech
REDIS_HOST=redis
REDIS_PORT=6379

# Service-specific variables
SERVICE_API_KEY=your-api-key-here
EXTERNAL_SERVICE_URL=https://api.example.com
EOF
```

## Phase 3: Infrastructure Configuration

### Step 3.1: Firewall Rule Addition
```bash
# Add UFW rule for new service
ssh root@207.148.31.73 'ufw allow 3011/tcp && ufw reload'

# Verify rule was added
ssh root@207.148.31.73 'ufw status | grep 3011'
```

### Step 3.2: Nginx Configuration
```bash
# Create nginx configuration on server
ssh root@207.148.31.73 << 'EOF'
cat > /etc/nginx/sites-available/new-service.mech.is << 'NGINX_EOF'
server {
    listen 80;
    server_name new-service.mech.is;
    
    # Cloudflare real IP configuration
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    real_ip_header CF-Connecting-IP;
    
    location / {
        proxy_pass http://localhost:3011;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_EOF

# Enable site
ln -sf /etc/nginx/sites-available/new-service.mech.is /etc/nginx/sites-enabled/

# Test and reload nginx
nginx -t && systemctl reload nginx
EOF
```

### Step 3.3: DNS Configuration
Add DNS record in Cloudflare:

1. Go to Cloudflare Dashboard → mech.is → DNS → Records
2. Click "Add record"
3. Type: `A`
4. Name: `new-service`
5. IPv4 address: `207.148.31.73`
6. Proxy status: ✅ Enabled (orange cloud)
7. Click "Save"

## Phase 4: Service Deployment

### Step 4.1: Local Testing
```bash
# Build and test locally first
cd mech-new-service
npm run build
docker build -t mech-new-service:latest .

# Test container locally
docker run --rm -p 3011:3011 --env-file .env.example mech-new-service:latest

# Test health endpoint
curl http://localhost:3011/health
```

### Step 4.2: Production Deployment
```bash
# Using the automated deployment script
./deploy-service.sh mech-new-service latest

# Or manual deployment
cd mech-new-service
docker buildx build --platform linux/amd64 -t derivativelabs/mech-new-service:latest --push .

# Deploy to server
ssh root@207.148.31.73 << 'EOF'
# Pull image
docker pull derivativelabs/mech-new-service:latest

# Stop existing container (if exists)
docker stop mech-new-service || true
docker rm mech-new-service || true

# Create environment file
mkdir -p /opt/mech-services/mech-new-service
cat > /opt/mech-services/mech-new-service/.env << 'ENV_EOF'
NODE_ENV=production
PORT=3011
MONGODB_URI=mongodb://mongodb:27017/mech
REDIS_HOST=redis
REDIS_PORT=6379
SERVICE_API_KEY=your-production-api-key
ENV_EOF

# Run container
docker run -d \
    --name mech-new-service \
    --network mech-network \
    -p 3011:3011 \
    --env-file /opt/mech-services/mech-new-service/.env \
    --restart unless-stopped \
    --health-cmd "curl -f http://localhost:3011/health || exit 1" \
    --health-interval 30s \
    --health-timeout 10s \
    --health-retries 3 \
    derivativelabs/mech-new-service:latest
EOF
```

## Phase 5: Service Integration

### Step 5.1: Update Deploy Script
```bash
# Add new service to deploy-service.sh
# Edit the get_service_port function:

get_service_port() {
    case "$1" in
        mech-queue) echo "3002" ;;
        mech-llms) echo "3008" ;;
        mech-storage) echo "3007" ;;
        mech-indexer) echo "3005" ;;
        mech-sequences) echo "3004" ;;
        mech-search) echo "3009" ;;
        mech-reader) echo "3001" ;;
        mech-memories) echo "3010" ;;
        mech-new-service) echo "3011" ;;  # ADD THIS LINE
        *) echo "" ;;
    esac
}
```

### Step 5.2: Update Troubleshoot Script
```bash
# Add to troubleshoot-service.sh SERVICE_PORTS array:
declare -A SERVICE_PORTS=(
    ["queue"]="3002"
    ["llms"]="3008" 
    ["storage"]="3007"
    ["indexer"]="3005"
    ["sequences"]="3004"
    ["reader"]="3001"
    ["search"]="3009"
    ["memories"]="3010"
    ["new-service"]="3011"  # ADD THIS LINE
)
```

### Step 5.3: Update Monitoring Scripts
```bash
# Add to platform-health-check.sh
services=("queue" "llms" "storage" "indexer" "sequences" "search" "reader" "memories" "new-service")

for service in "${services[@]}"; do
    check_service "$service"
done
```

### Step 5.4: Update Documentation
```bash
# Update DEPLOYMENT_COMPLETE_GUIDE.md port mapping table
# Update INFRASTRUCTURE_SETUP.md firewall rules
# Update service registry configuration
```

## Phase 6: Verification & Testing

### Step 6.1: Health Check Verification
```bash
# Internal health check
ssh root@207.148.31.73 'curl -f http://localhost:3011/health'

# External health check (after DNS propagation)
curl https://new-service.mech.is/health

# Check container status
ssh root@207.148.31.73 'docker ps | grep mech-new-service'
```

### Step 6.2: Service Integration Testing
```bash
# Test service-to-service communication
ssh root@207.148.31.73 'docker exec mech-new-service curl -f http://mech-queue:3002/health'

# Test database connectivity
ssh root@207.148.31.73 'docker exec mech-new-service curl -f http://mongodb:27017'

# Test Redis connectivity
ssh root@207.148.31.73 'docker exec mech-new-service redis-cli -h redis ping'
```

### Step 6.3: Load Testing (Optional)
```bash
# Basic load test
ab -n 100 -c 10 https://new-service.mech.is/health

# Or using curl
for i in {1..10}; do
    curl -w "%{time_total}s\n" -s -o /dev/null https://new-service.mech.is/health
done
```

## Phase 7: Registry Integration

### Step 7.1: Service Registration
```bash
# Register service with mech-registry
curl -X POST http://localhost:3020/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "id": "mech-new-service",
    "name": "mech-new-service",
    "description": "Description of the new service functionality",
    "version": "1.0.0",
    "repository": {
      "url": "https://github.com/org/mech-new-service"
    },
    "docker": {
      "registry": "derivativelabs",
      "image": "mech-new-service",
      "tag": "latest"
    },
    "configuration": {
      "port": 3011,
      "healthCheck": "/health",
      "environment": {
        "required": ["SERVICE_API_KEY"],
        "optional": ["LOG_LEVEL"]
      }
    },
    "deployment": {
      "minResources": {
        "size": "s-1vcpu-1gb",
        "memory": "1GB",
        "cpu": "1"
      },
      "domains": ["new-service.mech.is"],
      "nginx": {
        "enabled": true,
        "ssl": true
      }
    },
    "status": {
      "health": "healthy",
      "instances": [{
        "id": "prod-1",
        "environment": "production",
        "url": "https://new-service.mech.is",
        "status": "running",
        "deployedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }]
    }
  }'
```

### Step 7.2: Update Service Directory
```bash
# Create service configuration file
cat > service-configs/mech-new-service.yaml << 'EOF'
name: mech-new-service
version: 1.0.0
description: Description of the new service
runtime:
  port: 3011
  healthCheck: /health
  environment:
    NODE_ENV: production
    PORT: "3011"
    MONGODB_URI: "mongodb://mongodb:27017/mech"
    REDIS_HOST: "redis"
deployment:
  size: s-1vcpu-1gb
  region: nyc3
  tags:
    - new-service
    - api
nginx:
  enabled: true
  domain: new-service.mech.is
  ssl: true
monitoring:
  enabled: true
  alerting: true
EOF
```

## Phase 8: Monitoring & Maintenance

### Step 8.1: Log Configuration
```bash
# Configure log rotation for the new service
ssh root@207.148.31.73 << 'EOF'
cat > /etc/logrotate.d/mech-new-service << 'LOGROTATE_EOF'
/opt/mech-services/mech-new-service/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker kill -s USR1 mech-new-service 2>/dev/null || true
    endscript
}
LOGROTATE_EOF
EOF
```

### Step 8.2: Backup Configuration
```bash
# Add to backup script
echo 'mech-new-service' >> /opt/mech-services/shared/scripts/backup-services.list

# Update backup script to include new service
```

### Step 8.3: Monitoring Integration
```bash
# Add health check to monitoring script
cat >> /opt/mech-services/shared/scripts/monitor.sh << 'EOF'

# New service health check
echo -n "new-service: "
status=$(curl -s --max-time 3 http://localhost:3011/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "failed")
echo "$status"
EOF
```

## Phase 9: Documentation & Handoff

### Step 9.1: Service Documentation
```markdown
# mech-new-service/README.md

# Mech New Service

## Overview
Brief description of what this service does.

## API Endpoints
- `GET /health` - Health check
- `GET /api/status` - Service status
- `POST /api/endpoint` - Main functionality

## Environment Variables
- `SERVICE_API_KEY` - API key for external service
- `LOG_LEVEL` - Logging level (default: info)

## Local Development
```bash
npm install
npm run dev
```

## Deployment
```bash
./deploy-service.sh mech-new-service latest
```

## Monitoring
- Health: https://new-service.mech.is/health
- Logs: `docker logs mech-new-service`
```

### Step 9.2: Update Main Documentation
Update the following files:
- [ ] `DEPLOYMENT_COMPLETE_GUIDE.md` - Add service to port mapping
- [ ] `INFRASTRUCTURE_SETUP.md` - Add firewall rule
- [ ] `TROUBLESHOOTING_GUIDE.md` - Add service-specific troubleshooting
- [ ] `README.md` - Add service to main project documentation

## Service Onboarding Checklist

### Pre-Deployment
- [ ] Service code developed and tested
- [ ] Dockerfile created and tested
- [ ] Health endpoint implemented
- [ ] Environment variables documented
- [ ] Port allocated (update scripts)

### Infrastructure
- [ ] UFW firewall rule added
- [ ] Nginx configuration created
- [ ] DNS record added in Cloudflare
- [ ] SSL configuration verified

### Deployment
- [ ] Docker image built and pushed
- [ ] Container deployed to production
- [ ] Environment variables configured
- [ ] Health checks passing

### Integration
- [ ] Deploy script updated
- [ ] Troubleshoot script updated
- [ ] Monitoring script updated
- [ ] Service registered in registry

### Verification
- [ ] Internal health check working
- [ ] External HTTPS access working
- [ ] Service-to-service communication tested
- [ ] Load testing completed (if applicable)

### Documentation
- [ ] Service README created
- [ ] Main documentation updated
- [ ] API documentation created
- [ ] Deployment procedures documented

## Common Issues During Service Onboarding

### 1. Port Already in Use
```bash
# Check what's using the port
ss -tlnp | grep :3011
# Kill the process or choose a different port
```

### 2. Container Won't Start
```bash
# Check logs
docker logs mech-new-service
# Common issues: missing env vars, port conflicts, image problems
```

### 3. Health Check Failing
```bash
# Test health endpoint directly
curl http://localhost:3011/health
# Check if service is listening on 0.0.0.0, not 127.0.0.1
```

### 4. External Access Not Working
```bash
# Check nginx configuration
nginx -t
# Check DNS propagation
nslookup new-service.mech.is
# Check firewall rules
ufw status | grep 3011
```

## Service Removal Process

If you need to remove a service:

1. **Stop and remove container**
```bash
docker stop mech-new-service
docker rm mech-new-service
```

2. **Remove nginx configuration**
```bash
rm /etc/nginx/sites-enabled/new-service.mech.is
rm /etc/nginx/sites-available/new-service.mech.is
nginx -t && systemctl reload nginx
```

3. **Remove DNS record**
   - Delete A record in Cloudflare Dashboard

4. **Remove firewall rule**
```bash
ufw delete allow 3011/tcp
```

5. **Update scripts and documentation**
   - Remove from deploy-service.sh
   - Remove from troubleshoot-service.sh
   - Remove from monitoring scripts
   - Update documentation

This playbook ensures consistent and reliable service onboarding for the Mech platform.