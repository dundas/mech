# DigitalOcean Droplet Resize Guide

## Current Setup
- **Droplet**: queue-service (138.197.15.235)
- **Current Size**: s-2vcpu-2gb ($18/month)
- **Running Services**: Queue Service + Indexer Service

## Available Sizes (Smallest to Largest)

| Size | RAM | vCPU | Storage | Cost/Month | Notes |
|------|-----|------|---------|------------|-------|
| **s-1vcpu-512mb** | 512MB | 1 | 10GB | $4 | Absolute minimum |
| **s-1vcpu-1gb** | 1GB | 1 | 25GB | $6 | Recommended minimum |
| s-1vcpu-2gb | 2GB | 1 | 50GB | $12 | Good for light load |
| s-2vcpu-2gb | 2GB | 2 | 60GB | $18 | Current size |

## Quick Resize Commands

### 1. Create Snapshot (Backup)
```bash
# Get droplet ID
DROPLET_ID=$(doctl compute droplet list --format Name,ID --no-header | grep queue-service | awk '{print $2}')

# Create snapshot
doctl compute droplet-action snapshot $DROPLET_ID --snapshot-name "pre-resize-$(date +%Y%m%d-%H%M%S)"
```

### 2. Resize to Smallest Size
```bash
# Use the automated script (recommended)
./scripts/resize-droplet.sh s-1vcpu-512mb

# Or manually:
doctl compute droplet-action power-off $DROPLET_ID --wait
doctl compute droplet-action resize $DROPLET_ID --size s-1vcpu-512mb --wait
doctl compute droplet-action power-on $DROPLET_ID --wait
```

### 3. Verify Services After Resize
```bash
# Check health endpoints
curl http://138.197.15.235:3003/health  # Queue service
curl http://138.197.15.235:3005/health  # Indexer service

# SSH and check containers
ssh root@138.197.15.235 "docker ps"
```

## Resource Considerations

### Minimum Requirements
- **Queue Service**: ~256MB RAM
- **Indexer Service**: ~256MB RAM
- **Docker + OS**: ~200MB RAM
- **Total Minimum**: 512MB-1GB RAM

### Performance Impact of Downsizing
- Fewer concurrent workers
- Slower processing under load
- Possible memory pressure
- May need to tune worker counts

## Monitoring After Resize

### Check Memory Usage
```bash
ssh root@138.197.15.235 "free -h"
ssh root@138.197.15.235 "docker stats --no-stream"
```

### Check Service Logs
```bash
ssh root@138.197.15.235 "docker logs queue-service --tail 50"
ssh root@138.197.15.235 "docker logs indexer-service --tail 50"
```

### Monitor Metrics
```bash
curl http://138.197.15.235:3004/metrics | grep memory
```

## Rollback Plan

If services don't perform well on smaller size:

1. Power off droplet
2. Resize back to s-2vcpu-2gb or larger
3. Power on droplet
4. Verify services

## Cost Savings

- Current: s-2vcpu-2gb = $18/month
- Smallest: s-1vcpu-512mb = $4/month
- **Savings: $14/month (78% reduction)**

## Important Notes

1. **Downtime**: Expect 1-2 minutes during resize
2. **Permanent**: Downsizing is permanent (disk size reduction)
3. **Testing**: Monitor performance for 24-48 hours after resize
4. **Backup**: Always create snapshot before resizing