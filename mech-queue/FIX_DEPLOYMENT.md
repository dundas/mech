# Fix queue.mech.is Deployment

## Issue
The queue service is failing because it's trying to connect to hostname "redis" instead of the DigitalOcean Valkey database.

## Root Cause
The local `.env` file contains `REDIS_HOST=redis` which is being used instead of the production Valkey credentials.

## Quick Fix (Run on Digital Ocean Droplet)

1. SSH into the droplet:
```bash
ssh root@138.197.15.235
```

2. Copy and run the quick fix script:
```bash
# Option 1: Use the quick-fix script
scp scripts/quick-fix-production.sh root@138.197.15.235:/tmp/
ssh root@138.197.15.235 "bash /tmp/quick-fix-production.sh"

# Option 2: Manual fix
ssh root@138.197.15.235
```

If running manually on the server:
```bash
# Get Valkey credentials
doctl databases list
# Note the queue-valkey database ID

# Get connection details
doctl databases connection <DB_ID>

# Stop current container
docker stop queue-service
docker rm queue-service

# Run with correct environment variables
docker run -d \
    --name queue-service \
    --restart unless-stopped \
    -p 3003:3003 \
    -p 3004:3004 \
    -e NODE_ENV=production \
    -e REDIS_HOST="<VALKEY_HOST>" \
    -e REDIS_PORT="<VALKEY_PORT>" \
    -e REDIS_PASSWORD="<VALKEY_PASSWORD>" \
    -e REDIS_DB=0 \
    -e MONGODB_URI="your_mongodb_uri_here" \
    -e MASTER_API_KEY="your-secure-api-key" \
    -e ENABLE_API_KEY_AUTH=true \
    -e ENABLE_PROMETHEUS_METRICS=true \
    -e LOG_LEVEL=info \
    registry.digitalocean.com/queue-service-registry/queue-service:latest
```

## Permanent Fix

1. Update `.dockerignore` to exclude `.env` files:
```
.env
.env.*
logs/
node_modules/
```

2. Use the fixed deployment script:
```bash
cd mech-queue
./scripts/deploy-fixed.sh
```

## Verify Deployment

1. Check health endpoint:
```bash
curl https://queue.mech.is/health
```

2. Test API with authentication:
```bash
curl -H "x-api-key: your-api-key" https://queue.mech.is/api/queues
```

3. Check container logs on server:
```bash
ssh root@138.197.15.235 "docker logs queue-service"
```

## Environment Variables Needed

- `REDIS_HOST`: Valkey database host (e.g., db-valkey-nyc3-12345.b.db.ondigitalocean.com)
- `REDIS_PORT`: Valkey port (usually 25061)
- `REDIS_PASSWORD`: Valkey password
- `MASTER_API_KEY`: Secure API key for authentication
- `MONGODB_URI`: MongoDB connection string for persistence

## Important Notes

1. Never commit `.env` files with production credentials
2. Always use environment variables or secrets management for production
3. The deployment script automatically gets Valkey credentials from DigitalOcean
4. Make sure Docker image doesn't include local `.env` files