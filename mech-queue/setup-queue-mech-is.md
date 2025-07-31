# Setting up queue.mech.is

## Quick Setup Guide

### 1. Add mech.is to Cloudflare (if not already added)

1. Go to https://dash.cloudflare.com/
2. Click "Add a Site"
3. Enter `mech.is`
4. Update nameservers at your domain registrar with Cloudflare's nameservers

### 2. Add DNS Record for queue.mech.is

Once mech.is is active in Cloudflare:

1. Go to DNS settings for mech.is
2. Click "Add record"
3. Configure:
   - **Type**: `A`
   - **Name**: `queue`
   - **IPv4 address**: `138.197.15.235`
   - **Proxy status**: ✅ Proxied (orange cloud ON)
   - **TTL**: Auto

### 3. Your Queue Service URLs

Once DNS propagates (1-5 minutes), your service will be available at:

- **Health Check**: https://queue.mech.is/health
- **API Endpoints**: https://queue.mech.is/api/
- **Queue Stats**: https://queue.mech.is/api/queues/stats
- **Metrics**: https://queue.mech.is/metrics

### 4. Test Your New Domain

```bash
# Once DNS propagates, test the health endpoint
curl https://queue.mech.is/health

# Submit a test job
curl -X POST https://queue.mech.is/api/jobs/email \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "name": "test-email",
    "data": {
      "to": "test@example.com",
      "subject": "Hello from queue.mech.is",
      "body": "Your queue service is working perfectly on the new domain!"
    }
  }'
```

## Benefits of queue.mech.is

✅ **Professional branding** - mech.is is short and memorable
✅ **Clear purpose** - "queue" subdomain clearly indicates the service
✅ **HTTPS included** - Cloudflare provides free SSL
✅ **Global performance** - Cloudflare CDN and optimization
✅ **DDoS protection** - Built-in security features

## Update Your Applications

Replace your old API endpoints:
- OLD: `http://138.197.15.235:3003/api/`
- NEW: `https://queue.mech.is/api/`

## Monitoring Your Service

- **Uptime monitoring**: Set up monitoring for https://queue.mech.is/health
- **Cloudflare Analytics**: View traffic and performance in Cloudflare dashboard
- **Server metrics**: https://queue.mech.is/metrics (Prometheus format)