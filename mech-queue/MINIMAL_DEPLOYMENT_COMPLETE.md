# Minimal Deployment Complete

## 🚀 Deployment Status: SUCCESS

Both the Queue Service and Indexer Service have been successfully deployed to a minimal Digital Ocean droplet.

## 📋 Infrastructure Details

### Droplet Specifications
- **Name**: mech-services-minimal
- **IP Address**: 174.138.68.108
- **Size**: s-1vcpu-1gb (Minimal - $6/month)
- **Region**: NYC3
- **OS**: Ubuntu 22.04 with Docker

### Services Running
1. **Queue Service**
   - Port: 3003 (API), 3004 (Metrics)
   - Version: 1.0.0
   - Status: ✅ Healthy
   - Memory Limit: 400MB

2. **Indexer Service**
   - Port: 3005
   - Version: 2.0.0
   - Status: ✅ Healthy
   - Memory Limit: 400MB

## 🔗 Service Endpoints

### Direct Access (Current)
- Queue Health: http://174.138.68.108:3003/health
- Queue API: http://174.138.68.108:3003/api/explain
- Indexer Health: http://174.138.68.108:3005/health
- Indexer API: http://174.138.68.108:3005/api

### Domain Access (After DNS Update)
- Queue: https://queue.mech.is
- Indexer: https://indexer.mech.is

## 🌐 DNS Update Instructions

To point your domains to the new minimal droplet, update your DNS settings:

### Cloudflare Update Steps:
1. Log into Cloudflare dashboard
2. Select your domain (mech.is)
3. Go to DNS settings
4. Update the following A records:

| Type | Name    | Content (Old)   | Content (New)    | Proxy |
|------|---------|-----------------|------------------|-------|
| A    | queue   | 138.197.15.235  | 174.138.68.108   | ✅    |
| A    | indexer | 138.197.15.235  | 174.138.68.108   | ✅    |

### Alternative: Using Cloudflare API
```bash
# Update queue subdomain
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"queue","content":"174.138.68.108","proxied":true}'

# Update indexer subdomain
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"indexer","content":"174.138.68.108","proxied":true}'
```

## 🧪 Testing Commands

### Test Queue Service
```bash
# Health check
curl http://174.138.68.108:3003/health

# Submit a test job
curl -X POST "http://174.138.68.108:3003/api/jobs" \
  -H "x-api-key: test-master-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"queue":"test","data":{"message":"Hello from minimal droplet"}}'

# Check job status
curl -H "x-api-key: test-master-key-12345" \
  "http://174.138.68.108:3003/api/jobs/{jobId}"
```

### Test Indexer Service
```bash
# Health check
curl http://174.138.68.108:3005/health

# Get API info
curl http://174.138.68.108:3005/api
```

## 💰 Cost Comparison

### Previous Setup (s-2vcpu-2gb)
- Monthly Cost: ~$18/month
- Resources: 2 vCPU, 2GB RAM

### New Setup (s-1vcpu-1gb)
- Monthly Cost: ~$6/month
- Resources: 1 vCPU, 1GB RAM
- **Savings: $12/month (67% reduction)**

## 🔧 Management

### SSH Access
```bash
ssh root@174.138.68.108
```

### View Logs
```bash
# Queue service logs
ssh root@174.138.68.108 "docker logs queue-service"

# Indexer service logs
ssh root@174.138.68.108 "docker logs indexer-service"
```

### Restart Services
```bash
ssh root@174.138.68.108 "cd /opt/mech-services && docker-compose restart"
```

## 📝 Configuration Files

All configuration files are located at `/opt/mech-services/` on the droplet:
- `docker-compose.yml` - Service definitions
- `.env.services` - Environment variables

## ⚠️ Next Steps

1. **Update DNS records** to point to the new droplet (174.138.68.108)
2. **Monitor services** for 24-48 hours to ensure stability
3. **Shutdown old droplet** once DNS propagation is complete
4. **Set up monitoring** (optional) for the new services

## 🎉 Success!

Both services are now running on a minimal resource droplet, reducing infrastructure costs by 67% while maintaining full functionality.