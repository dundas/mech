# Single Service Deployment Guide

This guide covers deploying individual Mech services to the production droplet with proper nginx configuration and SSL certificates.

## Prerequisites

### 1. Authentication Setup
Ensure doctl is configured on both local machine and droplet:

```bash
# Local: Check authentication
doctl account get

# Droplet: Copy configuration
scp ~/.config/doctl/config.yaml root@174.138.68.108:/root/.config/doctl/config.yaml
# Or if on macOS:
scp "/Users/$(whoami)/Library/Application Support/doctl/config.yaml" root@174.138.68.108:/root/.config/doctl/config.yaml
```

### 2. Docker Platform Compatibility
Services must be built for AMD64 platform to run on the droplet:

```bash
docker build --platform linux/amd64 -t your-image .
```

## Available Services

| Service | Port | Domain | Description |
|---------|------|--------|-------------|
| mech-llms | 3008 | llm.mech.is | LLM providers (OpenAI, Anthropic, etc.) |
| mech-sequences | 3007 | sequences.mech.is | Workflow orchestration |
| mech-reader | 3001 | reader.mech.is | File processing and analysis |

## Deployment Process

### Step 1: Deploy Service

```bash
# Deploy individual service
./deploy-single-service.sh mech-llms

# The script will:
# 1. Validate service configuration
# 2. Build and test locally  
# 3. Build for AMD64 platform
# 4. Push to DigitalOcean registry
# 5. Create production environment file
# 6. Deploy to droplet with health checks
# 7. Test external access
```

### Step 2: Configure Nginx Proxy

After successful deployment, configure nginx for domain routing:

```bash
# SSH to droplet
ssh root@174.138.68.108

# Create nginx configuration for the service
cat > /etc/nginx/sites-available/llm.mech.is << 'EOF'
server {
    listen 80;
    server_name llm.mech.is;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name llm.mech.is;
    
    # SSL configuration (managed by Cloudflare or Let's Encrypt)
    ssl_certificate /etc/ssl/certs/mech.is.crt;
    ssl_certificate_key /etc/ssl/private/mech.is.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Proxy to service
    location / {
        proxy_pass http://localhost:3008;
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
        proxy_pass http://localhost:3008/health;
        access_log off;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/llm.mech.is /etc/nginx/sites-enabled/
```

### Step 3: Test and Reload Nginx

```bash
# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

# Check nginx status
systemctl status nginx
```

### Step 4: Configure Firewall

```bash
# Allow HTTP and HTTPS through UFW
ufw allow 80/tcp
ufw allow 443/tcp

# Verify firewall status
ufw status
```

## Service-Specific Configuration

### mech-llms Service

**Environment Variables:**
- `MONGODB_URI`: MongoDB connection string
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key (optional)
- `GOOGLE_API_KEY`: Google AI API key (optional)
- `TOGETHER_API_KEY`: Together AI API key (optional)
- `REDIS_URL`: Redis connection for caching
- `PORT`: Service port (3008)
- `NODE_ENV`: production
- `CORS_ORIGIN`: Allowed origins for CORS

**Health Check:** `GET /health`
**Key Features:** 
- Pure JavaScript/TypeScript stack
- Native SDK integrations
- No Python dependencies

### mech-sequences Service

**Environment Variables:**
- `MONGODB_URI`: MongoDB connection string
- `TEMPORAL_HOST`: Temporal.io server host
- `TEMPORAL_PORT`: Temporal.io server port
- `TEMPORAL_NAMESPACE`: Temporal namespace
- `QUEUE_SERVICE_URL`: Queue service URL
- `LLM_SERVICE_URL`: LLM service URL
- `STORAGE_SERVICE_URL`: Storage service URL
- `PORT`: Service port (3007)

### mech-reader Service

**Environment Variables:**
- `MONGODB_URI`: MongoDB connection string
- `QUEUE_SERVICE_URL`: Queue service URL
- `STORAGE_SERVICE_URL`: Storage service URL
- `OPENAI_API_KEY`: For document analysis
- `ASSEMBLYAI_API_KEY`: For audio transcription
- `MAX_FILE_SIZE`: Maximum file size (500MB)
- `TEMP_DIR`: Temporary directory for processing
- `PORT`: Service port (3001)

## Troubleshooting

### Common Issues

1. **Platform Mismatch Error**
   ```
   WARNING: The requested image's platform (linux/arm64) does not match the detected host platform (linux/amd64/v3)
   ```
   **Solution:** Use `--platform linux/amd64` when building Docker images

2. **Database Connection Failed**
   ```
   MongooseServerSelectionError: connect ECONNREFUSED ::1:27017
   ```
   **Solution:** Verify `MONGODB_URI` environment variable is correctly set

3. **doctl Authentication Failed**
   ```
   Error: Unable to initialize DigitalOcean API client: access token is required
   ```
   **Solution:** Copy doctl configuration from local machine to droplet

4. **Container Health Check Failed**
   - Check container logs: `docker logs <service-name>`
   - Verify environment variables: `docker exec <service-name> env`
   - Test health endpoint: `curl http://localhost:<port>/health`

### Useful Commands

```bash
# Check all running services
docker ps

# Check service logs
docker logs mech-llms --tail=50 --follow

# Restart a service
docker restart mech-llms

# Check service health
curl http://174.138.68.108:3008/health

# Check nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Monitor resource usage
docker stats --no-stream

# Check open ports
ss -tlnp | grep :3008
```

## SSL Certificate Management

### Option 1: Cloudflare (Recommended)
If using Cloudflare for DNS and SSL:

1. Enable "Full (strict)" SSL mode in Cloudflare
2. Use Cloudflare origin certificates
3. Configure nginx with Cloudflare certificates

### Option 2: Let's Encrypt
For direct SSL certificate management:

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d llm.mech.is

# Auto-renewal
systemctl enable certbot.timer
```

## Monitoring and Maintenance

### Health Monitoring
All services provide `/health` endpoints for monitoring:

```bash
# Check all service health
for port in 3001 3007 3008; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r .status 2>/dev/null || echo 'FAILED')"
done
```

### Log Rotation
Configure log rotation for Docker containers:

```bash
# /etc/logrotate.d/docker-containers
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=100M
    missingok
    delaycompress
    copytruncate
}
```

### Backup Strategy
- Database: Automated MongoDB Atlas backups
- Container images: Stored in DigitalOcean registry
- Configuration: Version controlled in git repository

## DNS Configuration

Ensure DNS records point to the droplet:

```
Type: A
Name: llm
Value: 174.138.68.108
TTL: 3600

Type: A  
Name: sequences
Value: 174.138.68.108
TTL: 3600

Type: A
Name: reader  
Value: 174.138.68.108
TTL: 3600
```

## Next Steps After Deployment

1. **Configure monitoring alerts**
2. **Set up automated backups**
3. **Configure log aggregation**
4. **Test failover scenarios**
5. **Document API endpoints**
6. **Set up CI/CD pipelines**

This deployment process ensures reliable, secure, and scalable service deployment with proper monitoring and maintenance procedures.