# Cloudflare DNS Configuration Guide

## Your Queue Service is Ready!

Your queue service is now accessible at:
- **Direct IP**: http://138.197.15.235
- **Health Check**: http://138.197.15.235/health
- **Metrics**: http://138.197.15.235/metrics

## Configure Cloudflare DNS

### Step 1: Add DNS Record in Cloudflare Dashboard

1. Log into your Cloudflare account
2. Select your domain (e.g., `yourdomain.com`)
3. Go to DNS settings
4. Click "Add record"

### Step 2: Create A Record

Add the following DNS record:

- **Type**: A
- **Name**: `api` (or whatever subdomain you prefer)
- **IPv4 address**: `138.197.15.235`
- **Proxy status**: ✅ Proxied (orange cloud)
- **TTL**: Auto

### Step 3: Wait for DNS Propagation

DNS changes typically take 1-5 minutes with Cloudflare.

### Step 4: Test Your Domain

Once configured, you can access:
- `https://api.yourdomain.com/health` (HTTPS automatically provided by Cloudflare)
- `https://api.yourdomain.com/api/queues/stats`
- `https://api.yourdomain.com/metrics`

## Benefits You Now Have:

✅ **Free SSL/TLS Certificate** - Cloudflare provides HTTPS automatically
✅ **DDoS Protection** - Built-in protection from attacks
✅ **Global CDN** - Your API responses can be cached globally
✅ **Hide Origin IP** - Your server's real IP is hidden
✅ **Web Application Firewall** - Additional security rules
✅ **Analytics** - See traffic patterns and performance

## API Usage Examples

### Submit a Job (with HTTPS!)
```bash
curl -X POST https://api.yourdomain.com/api/jobs/email \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "name": "send-email",
    "data": {
      "to": "user@example.com",
      "subject": "Hello from Queue Service",
      "body": "Your queue service is working!"
    }
  }'
```

### Check Queue Stats
```bash
curl https://api.yourdomain.com/api/queues/stats \
  -H "x-api-key: your-api-key"
```

## Optional: Advanced Cloudflare Settings

In Cloudflare dashboard, you can also:

1. **Page Rules** - Add caching rules for specific endpoints
2. **Firewall Rules** - Restrict access by country, IP, etc.
3. **Rate Limiting** - Prevent API abuse
4. **Transform Rules** - Modify requests/responses
5. **Workers** - Add edge computing (if needed later)

## Monitoring

Your service is now production-ready with:
- Nginx reverse proxy on standard ports
- Cloudflare protection and HTTPS
- Health monitoring at `/health`
- Prometheus metrics at `/metrics`

## Next Steps

1. Configure your domain in Cloudflare
2. Update your applications to use the new HTTPS endpoint
3. Set up monitoring/alerting for the `/health` endpoint
4. Consider adding Cloudflare rate limiting for API protection