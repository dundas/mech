# Hosted Services Configuration Guide

This guide documents the proper configuration for deploying Mech services to production hosting environments, based on real-world deployment experience.

## Table of Contents
- [Infrastructure Requirements](#infrastructure-requirements)
- [Redis/Valkey TLS Configuration](#redisvalkey-tls-configuration)
- [Docker Deployment](#docker-deployment)
- [Nginx Reverse Proxy Setup](#nginx-reverse-proxy-setup)
- [DNS Configuration](#dns-configuration)
- [Troubleshooting](#troubleshooting)

## Infrastructure Requirements

### Minimum Droplet Specifications
- **Size**: s-1vcpu-1gb (1 vCPU, 1GB RAM)
- **OS**: Ubuntu 22.04 with Docker
- **Cost**: ~$6/month (67% savings from standard setup)
- **Region**: Choose based on your user base

### Required Services
1. **Redis/Valkey Database** (Managed)
   - Digital Ocean Managed Database
   - SSL/TLS enabled (port 25061)
   - Connection string format: `rediss://user:password@host:25061`

2. **MongoDB** (Atlas or Managed)
   - Connection string with proper authentication
   - Database for queue metadata and subscriptions

3. **Docker Registry** (Optional)
   - Digital Ocean Container Registry
   - Or Docker Hub for public images

## Redis/Valkey TLS Configuration

### Critical Configuration for Managed Redis

When using Digital Ocean's managed Valkey/Redis database, you MUST configure TLS support:

```typescript
// ❌ WRONG - This will cause ECONNRESET errors
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
});

// ✅ CORRECT - Include TLS configuration for port 25061
const useTLS = config.redis.port === 25061;
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: null,
  ...(useTLS && {
    tls: {
      rejectUnauthorized: false
    }
  })
});
```

### Environment Variables
```bash
# Redis/Valkey Configuration
REDIS_HOST=queue-valkey-do-user-xxxxx.db.ondigitalocean.com
REDIS_PORT=25061  # SSL port
REDIS_PASSWORD=AVNS_xxxxxxxxxxxxx
REDIS_DB=0
```

## Docker Deployment

### Building for Production
Always build for the correct platform:
```bash
# Build for linux/amd64 (most cloud providers)
docker build --platform linux/amd64 -t your-service:latest .
```

### Docker Compose Configuration
```yaml
version: '3.8'

services:
  queue-service:
    image: your-registry/queue-service:latest
    container_name: queue-service
    restart: unless-stopped
    ports:
      - "3003:3003"
      - "3004:3004"  # Metrics port
    environment:
      - NODE_ENV=production
      - PORT=3003
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - MONGODB_URI=${MONGODB_URI}
      # ... other env vars
    deploy:
      resources:
        limits:
          memory: 400M  # Adjust based on droplet size
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Nginx Reverse Proxy Setup

### Installation
```bash
apt-get update && apt-get install -y nginx
```

### Configuration
Create `/etc/nginx/sites-available/mech-services`:

```nginx
# Queue Service
server {
    listen 80;
    listen [::]:80;
    server_name queue.mech.is;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Indexer Service
server {
    listen 80;
    listen [::]:80;
    server_name indexer.mech.is;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable Configuration
```bash
ln -sf /etc/nginx/sites-available/mech-services /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### Firewall Rules
```bash
ufw allow 22     # SSH
ufw allow 80     # HTTP
ufw allow 443    # HTTPS
ufw allow 3003   # Queue API (optional, for direct access)
ufw allow 3004   # Queue Metrics (optional)
ufw allow 3005   # Indexer API (optional)
ufw enable
```

## DNS Configuration

### Cloudflare Setup
1. Create A records pointing to your droplet IP:
   ```
   Type  Name     Content          Proxy
   A     queue    174.138.68.108   ✅ (Proxied)
   A     indexer  174.138.68.108   ✅ (Proxied)
   ```

2. Enable Cloudflare proxy (orange cloud) for:
   - Automatic HTTPS
   - DDoS protection
   - Caching benefits

### Important Notes
- Cloudflare expects services on ports 80/443
- This is why Nginx reverse proxy is essential
- Direct port access (3003, 3005) will not work through Cloudflare

## Troubleshooting

### Common Issues and Solutions

#### 1. ECONNRESET Errors with Redis
**Symptom**: Repeated `Error: read ECONNRESET` in logs
**Cause**: Missing TLS configuration for managed Redis
**Solution**: Add TLS configuration as shown above

#### 2. 521 Error from Cloudflare
**Symptom**: "Web server is down" error
**Cause**: No service listening on port 80/443
**Solution**: Install and configure Nginx reverse proxy

#### 3. 502 Bad Gateway
**Symptom**: Nginx returns 502 error
**Cause**: Backend service not running or wrong port
**Solution**: Check Docker containers and port mappings

#### 4. Docker Platform Errors
**Symptom**: `exec format error` when running container
**Cause**: Wrong platform architecture
**Solution**: Build with `--platform linux/amd64`

### Health Check Commands
```bash
# Check service health
curl http://localhost:3003/health

# Check nginx status
systemctl status nginx

# Check Docker containers
docker ps

# View service logs
docker logs queue-service --tail 50

# Test from external
curl https://queue.mech.is/health
```

## Deployment Checklist

- [ ] Droplet created with Docker pre-installed
- [ ] Firewall rules configured
- [ ] Redis/Valkey database created with SSL
- [ ] MongoDB connection string ready
- [ ] Docker images built for correct platform
- [ ] Services deployed and running
- [ ] Nginx installed and configured
- [ ] DNS records updated in Cloudflare
- [ ] Health endpoints verified
- [ ] SSL/HTTPS working through Cloudflare

## Cost Optimization

### Minimal Setup (Recommended)
- **Droplet**: s-1vcpu-1gb ($6/month)
- **Database**: Managed Valkey ($15/month)
- **Total**: ~$21/month

### Standard Setup
- **Droplet**: s-2vcpu-2gb ($18/month)
- **Database**: Managed Valkey ($15/month)
- **Total**: ~$33/month

**Savings**: 36% reduction in infrastructure costs

## Security Considerations

1. **API Keys**: Always use environment variables
2. **Firewall**: Enable UFW and restrict access
3. **Updates**: Keep Ubuntu and Docker updated
4. **Monitoring**: Set up alerts for service health
5. **Backups**: Regular snapshots of droplet
6. **Secrets**: Never commit credentials to git

## Monitoring

### Prometheus Metrics
Queue service exposes metrics on port 3004:
```bash
curl http://localhost:3004/metrics
```

### Recommended Monitoring Stack
1. Prometheus for metrics collection
2. Grafana for visualization
3. AlertManager for notifications

## Maintenance

### Updating Services
```bash
# Pull new image
docker pull your-registry/service:latest

# Restart service
docker-compose down && docker-compose up -d
```

### Log Rotation
Configure Docker to limit log sizes:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Regular Tasks
- Weekly: Check for security updates
- Monthly: Review resource usage
- Quarterly: Update dependencies

## Support

For issues specific to:
- **Digital Ocean**: Check their community forums
- **Docker**: Consult Docker documentation
- **Nginx**: Review Nginx documentation
- **Redis Connection**: Verify TLS configuration

Remember: Always test configuration changes in a staging environment first!