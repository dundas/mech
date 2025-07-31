# Deploy to DigitalOcean with Managed Valkey

## Prerequisites

1. **DigitalOcean Account** with billing enabled
2. **Docker Hub** or **DigitalOcean Container Registry** account
3. **DigitalOcean CLI** installed: `snap install doctl` or `brew install doctl`

## Step 1: Set up Managed Valkey Database

```bash
# Create Valkey cluster (Redis-compatible)
doctl databases create queue-valkey \
  --engine redis \
  --region nyc3 \
  --size db-s-1vcpu-1gb \
  --num-nodes 1

# Get connection details
doctl databases connection queue-valkey
```

This will output something like:
```
host = your-cluster.db.ondigitalocean.com
port = 25061
password = your-generated-password
```

## Step 2: Push Docker Image

### Option A: Docker Hub
```bash
# Tag and push to Docker Hub
docker tag referwith-queue-service your-dockerhub-username/queue-service:latest
docker push your-dockerhub-username/queue-service:latest
```

### Option B: DigitalOcean Container Registry
```bash
# Create registry
doctl registry create your-registry-name

# Get login credentials
doctl registry login

# Tag and push
docker tag referwith-queue-service registry.digitalocean.com/your-registry/queue-service:latest
docker push registry.digitalocean.com/your-registry/queue-service:latest
```

## Step 3: Create Droplet

```bash
# Create a droplet with Docker pre-installed
doctl compute droplet create queue-service \
  --image docker-20-04 \
  --size s-2vcpu-2gb \
  --region nyc3 \
  --ssh-keys your-ssh-key-id
```

## Step 4: Deploy Application

SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

Create production environment file:
```bash
# Create the environment file
cat > .env.production << EOF
VALKEY_HOST=your-cluster.db.ondigitalocean.com
VALKEY_PORT=25061
VALKEY_PASSWORD=your-valkey-password
VALKEY_DB=0
MASTER_API_KEY=$(openssl rand -hex 32)
SENDGRID_API_KEY=your_sendgrid_key
ENABLE_PROMETHEUS_METRICS=true
EOF
```

Create and run the production docker-compose:
```bash
# Download docker-compose.prod.yml
wget https://raw.githubusercontent.com/your-repo/queue-service/main/docker-compose.prod.yml

# Update image name in docker-compose.prod.yml if using custom registry
sed -i 's/referwith-queue-service:latest/your-dockerhub-username\/queue-service:latest/' docker-compose.prod.yml

# Run the service
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## Step 5: Configure Firewall

```bash
# Allow HTTP/HTTPS and your application ports
ufw allow 22
ufw allow 3003
ufw allow 3004
ufw --force enable
```

## Step 6: Set up Load Balancer (Optional)

For high availability:
```bash
doctl compute load-balancer create \
  --name queue-service-lb \
  --forwarding-rules entry_protocol:http,entry_port:80,target_protocol:http,target_port:3003 \
  --health-check protocol:http,port:3003,path:/health \
  --region nyc3 \
  --droplet-ids your-droplet-id
```

## Step 7: Configure Domain (Optional)

```bash
# Add A record pointing to your droplet IP or load balancer IP
doctl compute domain records create your-domain.com \
  --record-type A \
  --record-name queue \
  --record-data your-droplet-ip
```

## Testing Deployment

```bash
# Test health endpoint
curl http://your-domain.com:3003/health

# Test API with master key
curl -H "x-api-key: your-master-key" http://your-domain.com:3003/api/queues

# Test metrics
curl http://your-domain.com:3004/metrics
```

## Monitoring & Maintenance

### View Logs
```bash
docker compose -f docker-compose.prod.yml logs -f queue-service
```

### Update Application
```bash
# Pull latest image
docker compose -f docker-compose.prod.yml pull

# Restart with zero downtime
docker compose -f docker-compose.prod.yml up -d
```

### Backup Valkey Data
DigitalOcean automatically handles backups for managed databases.

## Cost Estimate (Monthly)

- **Valkey Database**: $15/month (1GB, 1 node)
- **Droplet**: $12/month (2GB RAM, 1 vCPU)
- **Load Balancer**: $12/month (optional)
- **Container Registry**: $5/month (optional)

**Total**: ~$27-44/month depending on options

## Security Checklist

- ✅ Valkey password authentication enabled
- ✅ API key authentication required
- ✅ Firewall configured
- ✅ Non-root user in Docker container
- ✅ Resource limits set
- ✅ Health checks configured
- ✅ Environment variables for secrets

## Scaling Options

1. **Vertical**: Resize droplet (`doctl compute droplet resize`)
2. **Horizontal**: Add more droplets behind load balancer
3. **Database**: Scale Valkey cluster nodes
4. **Container**: Increase worker counts via environment variables