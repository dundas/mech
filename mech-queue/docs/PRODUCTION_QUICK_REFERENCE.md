# Production Deployment Quick Reference

## ⚠️ Critical Configuration for Managed Redis/Valkey

### The #1 Issue: TLS Configuration

If using Digital Ocean Managed Database (port 25061), you MUST add TLS support:

```typescript
// In your Redis connection code:
const useTLS = redisConfig.port === 25061;

const redis = new Redis({
  ...redisConfig,
  maxRetriesPerRequest: null,
  ...(useTLS && {
    tls: {
      rejectUnauthorized: false
    }
  })
});
```

**Without this, you'll get constant `ECONNRESET` errors!**

## 🚀 Deployment Checklist

1. **Build for correct platform**
   ```bash
   docker build --platform linux/amd64 -t your-service:latest .
   ```

2. **Install Nginx** (Required for Cloudflare)
   ```bash
   apt-get update && apt-get install -y nginx
   ```

3. **Configure Nginx proxy**
   ```nginx
   server {
       listen 80;
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
       }
   }
   ```

4. **Update firewall**
   ```bash
   ufw allow 80
   ufw allow 443
   ufw allow 22
   ufw enable
   ```

5. **Environment variables**
   ```bash
   REDIS_HOST=your-valkey-host.db.ondigitalocean.com
   REDIS_PORT=25061  # SSL port!
   REDIS_PASSWORD=AVNS_xxxxxxxxxxxx
   MONGODB_URI=mongodb+srv://user:pass@cluster/db
   ```

## 🐛 Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ECONNRESET` errors | Missing TLS config | Add TLS configuration above |
| 521 from Cloudflare | No port 80 listener | Install Nginx proxy |
| 502 Bad Gateway | Service not running | Check Docker containers |
| `exec format error` | Wrong platform | Build with `--platform linux/amd64` |

## 📊 Health Checks

```bash
# Local check
curl http://localhost:3003/health

# Through domain
curl https://queue.mech.is/health

# Check logs
docker logs queue-service --tail 50
```

## 💰 Cost-Optimized Setup

- **Minimal Droplet**: s-1vcpu-1gb ($6/month)
- **Services per droplet**: 2-3 services max
- **Memory per service**: ~400MB limit

## 🔧 Quick Fixes

### Restart service
```bash
docker restart queue-service
```

### Update and restart
```bash
docker pull your-registry/service:latest
docker stop queue-service
docker rm queue-service
docker run -d --name queue-service ... your-registry/service:latest
```

### Check all services
```bash
docker ps
nginx -t
systemctl status nginx
```

Remember: **Always test locally first!**