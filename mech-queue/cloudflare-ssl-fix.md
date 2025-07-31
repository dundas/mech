# Fixing Cloudflare SSL Error 521

## Current Status
- ✅ DNS is configured correctly
- ✅ HTTP works: http://queue.mech.is/health
- ❌ HTTPS shows Error 521

## Quick Fix in Cloudflare Dashboard

1. **Go to**: https://dash.cloudflare.com/
2. **Select**: mech.is domain
3. **Navigate to**: SSL/TLS → Overview
4. **Change SSL mode to**: "Flexible" (currently it might be set to "Full")

### SSL Mode Options:
- **Flexible** ✅ (Use this) - Cloudflare to visitor uses HTTPS, Cloudflare to origin uses HTTP
- **Full** - Requires SSL certificate on origin (we don't have one)
- **Full (strict)** - Requires valid SSL certificate on origin

## Alternative Fixes

### Option 1: Keep "Full" SSL and Install Certificate
```bash
# Install certbot on server
ssh root@138.197.15.235
apt-get update
apt-get install certbot python3-certbot-nginx
certbot --nginx -d queue.mech.is
```

### Option 2: Use Cloudflare Origin Certificate
1. Go to SSL/TLS → Origin Server
2. Create certificate for queue.mech.is
3. Install on your server

## Verify It's Working

Once you change to "Flexible" SSL:
```bash
# Test HTTPS
curl https://queue.mech.is/health

# Should return JSON health data
```

## Why This Happens

Cloudflare's "Full" SSL mode expects your origin server (138.197.15.235) to have an SSL certificate. Since we only have HTTP on port 80, Cloudflare can't establish a secure connection, resulting in Error 521.

"Flexible" SSL mode allows:
- Visitors → Cloudflare: HTTPS (encrypted)
- Cloudflare → Your Server: HTTP (unencrypted)

This is perfectly fine for most applications, especially when the origin server is not publicly accessible.