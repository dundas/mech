# Docker Local Build and Deployment Guide

## Overview
This guide documents the process of building Docker images locally and deploying them directly to droplets without using a container registry. This approach is useful when:
- Container registry access is limited or unavailable
- You want faster deployments without registry push/pull overhead
- You need to test services quickly
- You're deploying to a single droplet

## Prerequisites
- Docker installed locally with buildx support
- SSH access to target droplets
- Service configuration files ready
- MongoDB connection string and required API keys

## Standard Process

### 1. Test Service Locally First

Before deploying, always test the service locally to ensure it works:

```bash
# Example: Testing mech-reader
docker run --rm -d -p 3031:3001 \
  -e NODE_ENV=development \
  -e PORT=3001 \
  -e MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db" \
  -e OPENAI_API_KEY="your-api-key" \
  --name service-test \
  service-name:latest

# Test health endpoint
curl http://localhost:3031/health

# Stop test container
docker stop service-test
```

### 2. Check Target Architecture

**CRITICAL**: Always verify the target droplet architecture before building:

```bash
# Check droplet architecture
ssh root@DROPLET_IP "uname -m"
# Output: x86_64 (for AMD64) or aarch64 (for ARM64)

# Check your local architecture
docker info | grep Architecture
```

### 3. Build for Correct Architecture

Build the Docker image for the target platform:

```bash
# For AMD64/x86_64 droplets (most DigitalOcean droplets)
docker buildx build --platform linux/amd64 -t service-name:amd64 ./service-directory/

# For ARM64 droplets (if applicable)
docker buildx build --platform linux/arm64 -t service-name:arm64 ./service-directory/

# For multi-arch support
docker buildx build --platform linux/amd64,linux/arm64 -t service-name:latest ./service-directory/
```

### 4. Save Docker Image

Save the built image to a compressed tar file:

```bash
# Save the image
docker save service-name:amd64 > service-name-amd64.tar

# Compress it (reduces transfer time)
gzip service-name-amd64.tar

# Check file size
ls -lh service-name-amd64.tar.gz
```

### 5. Transfer to Droplet

Copy the compressed image to the target droplet:

```bash
# Create service directory on droplet if needed
ssh root@DROPLET_IP "mkdir -p /opt/mech-service"

# Transfer the image
scp service-name-amd64.tar.gz root@DROPLET_IP:/opt/mech-service/
```

### 6. Load and Run on Droplet

SSH into the droplet and deploy the service:

```bash
ssh root@DROPLET_IP << 'EOF'
# Load the Docker image
echo "Loading Docker image..."
gunzip -c /opt/mech-service/service-name-amd64.tar.gz | docker load

# Create environment file
cat > /opt/mech-service/.env << 'ENVEOF'
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
# Add other required environment variables
ENVEOF

# Stop existing container if running
docker stop service-name 2>/dev/null || true
docker rm service-name 2>/dev/null || true

# Run the service
docker run -d \
  --name service-name \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file /opt/mech-service/.env \
  service-name:amd64

# Verify deployment
sleep 10
docker ps | grep service-name
curl -s http://localhost:3001/health | jq
EOF
```

## Complete Example: Deploying mech-reader

```bash
# 1. Build for AMD64
docker buildx build --platform linux/amd64 -t mech-reader:amd64 mech-reader/

# 2. Save and compress
docker save mech-reader:amd64 | gzip > mech-reader-amd64.tar.gz

# 3. Transfer to droplet
scp mech-reader-amd64.tar.gz root@165.227.194.103:/opt/mech-service/

# 4. Deploy on droplet
ssh root@165.227.194.103 << 'EOF'
gunzip -c /opt/mech-service/mech-reader-amd64.tar.gz | docker load
docker run -d \
  --name mech-reader \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file /opt/mech-service/.env \
  mech-reader:amd64
EOF

# 5. Test via public URL
curl https://reader.mech.is/health
```

## Automation Script Template

Create a reusable script for any service:

```bash
#!/bin/bash
# deploy-local-docker.sh

SERVICE_NAME=$1
DROPLET_IP=$2
SERVICE_PORT=$3
DOCKERFILE_PATH=$4

if [ $# -lt 4 ]; then
  echo "Usage: $0 <service-name> <droplet-ip> <port> <dockerfile-path>"
  exit 1
fi

echo "🚀 Deploying $SERVICE_NAME to $DROPLET_IP"

# Build for AMD64
echo "📦 Building Docker image..."
docker buildx build --platform linux/amd64 -t $SERVICE_NAME:amd64 $DOCKERFILE_PATH/

# Save and compress
echo "💾 Saving image..."
docker save $SERVICE_NAME:amd64 | gzip > $SERVICE_NAME-amd64.tar.gz

# Transfer
echo "📤 Transferring to droplet..."
scp $SERVICE_NAME-amd64.tar.gz root@$DROPLET_IP:/opt/mech-service/

# Deploy
echo "🔧 Deploying on droplet..."
ssh root@$DROPLET_IP << EOF
gunzip -c /opt/mech-service/$SERVICE_NAME-amd64.tar.gz | docker load
docker stop $SERVICE_NAME 2>/dev/null || true
docker rm $SERVICE_NAME 2>/dev/null || true
docker run -d \
  --name $SERVICE_NAME \
  --restart unless-stopped \
  -p $SERVICE_PORT:$SERVICE_PORT \
  --env-file /opt/mech-service/.env \
  $SERVICE_NAME:amd64
sleep 10
docker ps | grep $SERVICE_NAME
EOF

# Cleanup
rm -f $SERVICE_NAME-amd64.tar.gz

echo "✅ Deployment complete!"
```

## Best Practices

### 1. Always Test Locally First
- Verify the service works before deploying
- Check all environment variables are correct
- Test health endpoints

### 2. Architecture Matching
- **CRITICAL**: Build for the correct architecture
- DigitalOcean droplets are typically x86_64/AMD64
- Local M1/M2 Macs are ARM64 - must use buildx

### 3. Environment Management
- Keep sensitive credentials in .env files
- Never hardcode credentials in Dockerfiles
- Use consistent environment variable names

### 4. Health Checks
- Always implement health endpoints
- Test health endpoints after deployment
- Configure nginx to use health checks

### 5. Cleanup
- Remove old containers before deploying new ones
- Clean up tar.gz files after deployment
- Use `docker system prune` periodically on droplets

## Troubleshooting

### Image Architecture Mismatch
```
Error: exec format error
```
**Solution**: Rebuild with correct platform flag

### Port Already in Use
```
Error: bind: address already in use
```
**Solution**: Stop existing container or use different port

### Cannot Connect to Service
**Check**:
1. Container is running: `docker ps`
2. Logs: `docker logs service-name`
3. Port mapping: `docker port service-name`
4. Firewall rules: `ufw status`

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a
```

## Service-Specific Configurations

### mech-reader
- Port: 3001
- Requires: MongoDB, OpenAI API key
- Health: `/health`

### mech-search
- Port: 3009
- Requires: Serper API key
- Health: `/api/health`

### mech-llms
- Port: 3008
- Requires: MongoDB, OpenAI/Anthropic keys
- Health: `/health`

### mech-sequences
- Port: 3004
- Requires: MongoDB, Redis
- Health: `/health`

### mech-memories
- Port: 3005
- Requires: MongoDB
- Health: `/health`

## Registry Update After Deployment

Once deployed, update the Mech Registry:

```bash
curl -X PUT http://localhost:3020/api/services/SERVICE_NAME \
  -H "Content-Type: application/json" \
  -d '{
    "status": {
      "instances": [{
        "id": "prod-1",
        "environment": "production",
        "url": "https://SERVICE.mech.is",
        "status": "running",
        "version": "1.0.0",
        "deployedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }]
    }
  }'
```

## Summary

This approach provides:
- ✅ Fast deployments without registry dependencies
- ✅ Full control over the deployment process
- ✅ Easy rollback (keep previous tar.gz files)
- ✅ Works with any Docker-compatible service
- ✅ No registry storage limits or costs

Perfect for:
- Development and testing
- Single-droplet deployments
- Quick iterations
- Registry-free environments