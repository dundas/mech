# Queue Service Droplet Recovery Plan

## Current Situation
- Droplet IP 138.197.15.235 appears to be stopped/deleted due to exposed Redis security issue
- DigitalOcean Valkey database `queue-valkey` is still active
- Domain queue.mech.is points to the missing droplet

## Recovery Steps

### Option 1: If Droplet Was Just Stopped

1. **Check DigitalOcean Dashboard**
   - Log into DigitalOcean web console
   - Look for stopped/archived droplets
   - If found, DO NOT start it yet without fixing Redis

2. **Before Starting Droplet**
   - Create a snapshot/backup first
   - Plan to fix Redis immediately upon startup

3. **Start and Fix**
   ```bash
   # Start droplet from DigitalOcean console
   # Then immediately SSH and fix:
   ssh root@138.197.15.235
   
   # Remove Redis completely
   sudo systemctl stop redis redis-server
   sudo apt-get purge -y redis-server redis-tools
   sudo rm -rf /etc/redis /var/lib/redis
   
   # Block port 6379
   sudo ufw deny 6379/tcp
   sudo ufw --force enable
   ```

### Option 2: Create New Droplet

1. **Create New Droplet**
   ```bash
   doctl compute droplet create queue-service-new \
     --image docker-20-04 \
     --size s-2vcpu-2gb \
     --region nyc3 \
     --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1) \
     --wait
   ```

2. **Get New IP**
   ```bash
   NEW_IP=$(doctl compute droplet list --format Name,PublicIPv4 --no-header | grep queue-service-new | awk '{print $2}')
   echo "New droplet IP: $NEW_IP"
   ```

3. **Deploy Queue Service**
   ```bash
   cd mech-queue
   DROPLET_IP=$NEW_IP ./scripts/deploy-fixed.sh
   ```

4. **Update DNS**
   - Update queue.mech.is to point to new IP in Cloudflare
   - Or update in DigitalOcean if using their DNS

### Option 3: Use DigitalOcean App Platform

Create `app.yaml`:
```yaml
name: queue-service
region: nyc
services:
- name: queue
  image:
    registry_type: DOCR
    registry: queue-service-registry
    repository: queue-service
    tag: latest
  http_port: 3003
  instance_count: 1
  instance_size_slug: professional-xs
  health_check:
    http_path: /health
  envs:
  - key: NODE_ENV
    value: production
  - key: REDIS_HOST
    value: ${queue-valkey.HOSTNAME}
  - key: REDIS_PORT
    value: ${queue-valkey.PORT}
  - key: REDIS_PASSWORD
    value: ${queue-valkey.PASSWORD}
  - key: MASTER_API_KEY
    value: ${MASTER_API_KEY}
    type: SECRET
databases:
- name: queue-valkey
  engine: REDIS
  production: true
```

Deploy:
```bash
doctl apps create --spec app.yaml
```

## Immediate Actions

1. **Reply to DigitalOcean**
   - Acknowledge the security issue
   - Explain the droplet has been stopped/removed
   - Confirm Redis is no longer exposed
   - Ask if they stopped the droplet or if you need to take further action

2. **Check DigitalOcean Dashboard**
   - Look for any suspended/stopped resources
   - Check billing/account status
   - Review any other security notifications

3. **Prepare New Deployment**
   - Ensure deployment scripts exclude Redis
   - Use only managed Valkey database
   - Implement proper firewall rules

## Prevention

1. **Never install Redis on droplets**
   - Always use DigitalOcean Managed Databases
   - No local Redis installations

2. **Firewall Rules**
   ```bash
   # Default secure firewall
   ufw default deny incoming
   ufw default allow outgoing
   ufw allow 22/tcp    # SSH
   ufw allow 80/tcp    # HTTP
   ufw allow 443/tcp   # HTTPS
   ufw allow 3003/tcp  # Queue API
   ufw allow 3004/tcp  # Metrics
   ufw --force enable
   ```

3. **Security Monitoring**
   - Enable DigitalOcean monitoring
   - Set up alerts for open ports
   - Regular security audits

## Contact DigitalOcean Support

If the droplet was suspended/deleted by DigitalOcean:
- Reply to ticket #10799259
- Confirm the security issue is understood
- Request guidance on restoring service
- Provide assurance that Redis won't be installed again