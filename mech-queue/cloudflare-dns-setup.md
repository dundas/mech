# Cloudflare DNS Setup (No Worker Required)

## Simple DNS Configuration

For basic domain pointing, you only need to configure DNS records in Cloudflare:

### 1. Add A Record
In your Cloudflare dashboard:
- Type: A
- Name: api (or @ for root domain)
- IPv4 address: 138.197.15.235
- Proxy status: DNS only (grey cloud) OR Proxied (orange cloud)

### 2. Configure Your Service Ports
Your service runs on:
- Main API: Port 3003
- Metrics: Port 3004

### When to Use DNS Only:
✅ You're okay with using non-standard ports (api.yourdomain.com:3003)
✅ You don't need HTTPS (or will handle it at the server level)
✅ You don't need Cloudflare's WAF, caching, or other features

### When to Use Cloudflare Proxy (Orange Cloud):
✅ You want DDoS protection
✅ You want to hide your server's real IP
❌ BUT: Cloudflare proxy only works with standard ports (80, 443, 8080, 8443, etc.)
❌ Your service uses port 3003, which won't work through Cloudflare proxy

## Options to Make It Work with Cloudflare Proxy:

### Option A: Change Your Service Port
Modify your service to run on port 8080 or 8443:
```bash
# In your .env file
PORT=8080
```

### Option B: Use a Reverse Proxy (Nginx)
Install Nginx on your server to proxy port 80/443 to your service:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option C: Use Cloudflare Worker (See cloudflare-worker setup)
This allows you to keep your service on port 3003 and use Cloudflare's features.