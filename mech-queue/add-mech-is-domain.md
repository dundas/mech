# Adding mech.is Domain to Cloudflare

## Step 1: Add Domain to Cloudflare

### If mech.is is NOT already in Cloudflare:

1. **Go to Cloudflare Dashboard**: https://dash.cloudflare.com/
2. **Click "Add a Site"** button
3. **Enter**: `mech.is`
4. **Select a plan** (Free plan is fine)
5. **Cloudflare will scan existing DNS records**

### Update Nameservers at Your Registrar:

Cloudflare will provide 2 nameservers like:
- `xxx.ns.cloudflare.com`
- `yyy.ns.cloudflare.com`

Go to your domain registrar (where you bought mech.is) and update the nameservers.

## Step 2: Configure DNS for Queue Service

Once the domain is active in Cloudflare (may take up to 24 hours for nameserver changes):

### Add DNS Records:

1. **Main API Endpoint**
   - Type: `A`
   - Name: `api`
   - IPv4: `138.197.15.235`
   - Proxy: ✅ ON
   - Result: `api.mech.is`

2. **Queue-specific Subdomain**
   - Type: `A`
   - Name: `queue`
   - IPv4: `138.197.15.235`
   - Proxy: ✅ ON
   - Result: `queue.mech.is`

3. **Root Domain (Optional)**
   - Type: `A`
   - Name: `@`
   - IPv4: `138.197.15.235`
   - Proxy: ✅ ON
   - Result: `mech.is`

## Step 3: Update Nginx Configuration

To support multiple domains, update the Nginx config on your server:

```nginx
server {
    listen 80;
    listen [::]:80;
    
    # Support multiple domains
    server_name api.mech.is queue.mech.is mech.is api.wth.cx queue.wth.cx _;
    
    # Rest of configuration remains the same...
}
```

## Step 4: Apply Nginx Changes

```bash
# SSH into server
ssh root@138.197.15.235

# Edit Nginx config
nano /etc/nginx/sites-available/queue-service

# Update server_name line to include new domains
# Save and exit

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

## Your Service URLs

Once DNS propagates, your queue service will be available at:

### Primary URLs (mech.is)
- https://api.mech.is/health
- https://api.mech.is/api/queues/stats
- https://api.mech.is/metrics
- https://queue.mech.is/health

### API Examples
```bash
# Health check
curl https://api.mech.is/health

# Submit a job
curl -X POST https://api.mech.is/api/jobs/email \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "name": "test-email",
    "data": {
      "to": "test@example.com",
      "subject": "Hello from mech.is",
      "body": "Your queue service on mech.is is working!"
    }
  }'
```

## Benefits of Using mech.is

1. **Short and memorable** domain name
2. **Professional appearance** for your queue API
3. **Multiple subdomains** for different services
4. **Cloudflare benefits**: HTTPS, DDoS protection, caching

## Timeline

- **Nameserver update**: 0-24 hours (usually 1-4 hours)
- **DNS record propagation**: 1-5 minutes after domain is active
- **HTTPS certificate**: Automatic, immediate once proxied

## Verification

Check domain status:
```bash
# Check nameservers
dig mech.is NS

# Check A record once configured
dig api.mech.is A

# Test HTTPS once propagated
curl -I https://api.mech.is/health
```