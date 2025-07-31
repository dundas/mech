# Quick Cloudflare DNS Setup

Since automatic configuration requires specific API permissions, here's the quickest way to set it up manually:

## 1. Open Cloudflare Dashboard
Click this link: https://dash.cloudflare.com/

## 2. Select Your Domain
Choose the domain you want to use (e.g., `wth.cx` or any domain you own)

## 3. Go to DNS Settings
Click on "DNS" in the left sidebar

## 4. Add DNS Record
Click the "Add record" button and enter:

- **Type**: `A`
- **Name**: `queue` (or any subdomain you prefer)
- **IPv4 address**: `138.197.15.235`
- **Proxy status**: ✅ Proxied (orange cloud ON)
- **TTL**: Auto

Click "Save"

## 5. Done! 🎉

Your queue service will be available at:
- https://queue.yourdomain.com/health
- https://queue.yourdomain.com/api/queues/stats
- https://queue.yourdomain.com/metrics

## Example API Call

```bash
# Test the health endpoint
curl https://queue.yourdomain.com/health

# Submit a job
curl -X POST https://queue.yourdomain.com/api/jobs/email \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "name": "test-email",
    "data": {
      "to": "test@example.com",
      "subject": "Hello from Queue Service",
      "body": "Your queue service is working perfectly!"
    }
  }'
```

## Benefits You Get

✅ **Free HTTPS** - Cloudflare provides SSL automatically
✅ **Global CDN** - Your API is cached at edge locations
✅ **DDoS Protection** - Built-in attack mitigation
✅ **Analytics** - See your API usage in Cloudflare dashboard
✅ **Hide Origin IP** - Your server IP (138.197.15.235) is hidden

The DNS change typically takes 1-5 minutes to propagate.