# Search Service Deployment Instructions

## Overview
This guide provides step-by-step instructions for deploying the mech-search service to the DigitalOcean droplet.

## Prerequisites

1. **Ensure doctl is authenticated**:
   ```bash
   doctl account get
   ```

2. **SSH access to droplet**:
   ```bash
   ssh root@174.138.68.108
   ```

## Deployment Steps

### 1. Deploy the Service

From the project root directory:

```bash
# Option 1: Use the main deployment script
./deploy-single-service.sh mech-search

# Option 2: Use the service-specific script
cd mech-search
./build-and-deploy.sh
```

The deployment script will:
- Build the service for AMD64 platform
- Push to DigitalOcean Container Registry
- Deploy to the droplet on port 3009
- Configure environment variables
- Run health checks

### 2. Configure Nginx on the Droplet

SSH into the droplet and set up nginx:

```bash
# SSH to droplet
ssh root@174.138.68.108

# Copy the nginx configuration
cat > /etc/nginx/sites-available/search.mech.is << 'EOF'
server {
    listen 80;
    server_name search.mech.is;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name search.mech.is;
    
    # SSL configuration (managed by Cloudflare)
    ssl_certificate /etc/ssl/certs/mech.is.crt;
    ssl_certificate_key /etc/ssl/private/mech.is.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Proxy to service
    location / {
        proxy_pass http://localhost:3009;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3009/health;
        access_log off;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/search.mech.is /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### 3. Configure DNS

Ensure DNS A record exists:
- Type: A
- Name: search
- Value: 174.138.68.108
- TTL: 3600

### 4. Verify Deployment

```bash
# Check container status
docker ps --filter name=mech-search

# Check service health
curl http://localhost:3009/health

# Check logs
docker logs mech-search --tail=50

# Test external access
curl https://search.mech.is/health

# Test explain endpoint
curl https://search.mech.is/api/explain
```

## Environment Variables

The search service uses these environment variables:

- `SERPER_API_KEY`: API key for Serper search service
- `NODE_ENV`: production
- `PORT`: 3009
- `CORS_ORIGINS`: Allowed origins for CORS
- `RATE_LIMIT_WINDOW_MS`: Rate limit window (60000ms)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (100)
- `LOG_LEVEL`: Logging level (info)

## Service Endpoints

- `GET /health` - Health check
- `GET /api/explain` - Comprehensive API documentation
- `POST /api/search` - General web search
- `POST /api/search/images` - Image search
- `POST /api/search/videos` - Video search
- `POST /api/search/news` - News search
- `POST /api/search/scholar` - Academic search
- `POST /api/search/platform` - Platform-specific search
- `POST /api/social/search` - Social media profile search

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs mech-search

# Check environment
docker exec mech-search env

# Restart container
docker restart mech-search
```

### Nginx errors
```bash
# Check nginx logs
tail -f /var/log/nginx/error.log

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### DNS not resolving
- Wait 5-10 minutes for DNS propagation
- Check DNS with: `dig search.mech.is`
- Verify A record in DNS provider

## Monitoring

```bash
# Container stats
docker stats mech-search

# Service logs
docker logs mech-search --follow

# System resources
htop
```

## Updating the Service

To update the search service:

```bash
# From project root
./deploy-single-service.sh mech-search

# The script will automatically:
# - Build new image
# - Push to registry
# - Stop old container
# - Start new container
# - Verify health
```