# Agent Deployment Quick Reference

## 🚀 Quick Deploy Command

For most mech services:
```bash
./deploy-local-docker.sh <service-name> <droplet-ip> <port>
```

## 📋 Service Deployment Matrix

| Service | Port | Droplet IP | Command |
|---------|------|------------|---------|
| mech-llms | 3008 | 68.183.102.57 | `./deploy-local-docker.sh mech-llms 68.183.102.57 3008` |
| mech-search | 3009 | 192.81.212.16 | `./deploy-local-docker.sh mech-search 192.81.212.16 3009` |
| mech-reader | 3001 | 165.227.194.103 | `./deploy-local-docker.sh mech-reader 165.227.194.103 3001` |
| mech-sequences | 3004 | TBD | `./deploy-local-docker.sh mech-sequences DROPLET_IP 3004` |
| mech-memories | 3005 | TBD | `./deploy-local-docker.sh mech-memories DROPLET_IP 3005` |
| mech-storage | 3003 | TBD | `./deploy-local-docker.sh mech-storage DROPLET_IP 3003` |
| mech-queue | 3002 | TBD | `./deploy-local-docker.sh mech-queue DROPLET_IP 3002` |
| mech-indexer | 3006 | TBD | `./deploy-local-docker.sh mech-indexer DROPLET_IP 3006` |
| mech-analyzer | 3007 | TBD | `./deploy-local-docker.sh mech-analyzer DROPLET_IP 3007` |

## 🔧 Environment Variables

Each service requires specific environment variables. The script will create a template .env file if none exists.

### Common Variables (All Services)
```bash
NODE_ENV=production
PORT=<service-port>
MONGODB_URI=your_mongodb_uri_here
```

### Service-Specific Variables

#### mech-llms
```bash
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=<your-key>
REDIS_URL=<your-redis-url>
```

#### mech-search
```bash
SERPER_API_KEY=<your-key>
ENSEMBLE_API_KEY=<your-key>
```

#### mech-reader
```bash
OPENAI_API_KEY=your_openai_key_here
ASSEMBLYAI_API_KEY=<your-key>
MAX_FILE_SIZE=500000000
```

#### mech-sequences
```bash
REDIS_URL=<your-redis-url>
```

## 🎯 Step-by-Step Process

### 1. Pre-Deployment Checklist
- [ ] Service has a Dockerfile
- [ ] Environment variables are documented
- [ ] Target droplet is running and accessible
- [ ] Nginx is configured on the droplet (if needed)

### 2. Deploy Service
```bash
# Basic deployment
./deploy-local-docker.sh mech-servicename DROPLET_IP PORT

# Custom dockerfile location
./deploy-local-docker.sh mech-servicename DROPLET_IP PORT ./path/to/service
```

### 3. Verify Deployment
```bash
# Check if service is running
ssh root@DROPLET_IP 'docker ps | grep mech-servicename'

# Check logs
ssh root@DROPLET_IP 'docker logs mech-servicename'

# Test health endpoint
curl http://DROPLET_IP:PORT/health
# or
curl http://DROPLET_IP:PORT/api/health
```

### 4. Update Registry
```bash
# The script automatically updates the registry if it's running locally
# Manual update if needed:
curl -X PUT http://localhost:3020/api/services/mech-servicename \
  -H "Content-Type: application/json" \
  -d '{
    "status": {
      "health": "healthy",
      "instances": [{
        "id": "prod-1",
        "environment": "production",
        "url": "https://servicename.mech.is",
        "status": "running"
      }]
    }
  }'
```

## 🚨 Common Issues & Solutions

### Architecture Mismatch
**Error**: `exec format error`
**Solution**: Script automatically detects and builds for correct architecture

### Port Already in Use
**Error**: `bind: address already in use`
**Solution**: Script stops existing containers automatically

### Missing Environment Variables
**Error**: Service crashes on startup
**Solution**: Edit `/opt/mech-service/.env` on the droplet

### Health Check Fails
**Check**:
1. Service logs: `ssh root@DROPLET_IP 'docker logs service-name'`
2. Environment variables are correct
3. Required services (MongoDB, Redis) are accessible

## 📊 Monitoring After Deployment

### Check Service Health
```bash
# Via direct IP
curl http://DROPLET_IP:PORT/health

# Via domain (if configured)
curl https://service.mech.is/health
```

### View Logs
```bash
# Last 50 lines
ssh root@DROPLET_IP 'docker logs --tail 50 mech-servicename'

# Follow logs
ssh root@DROPLET_IP 'docker logs -f mech-servicename'
```

### Resource Usage
```bash
ssh root@DROPLET_IP 'docker stats --no-stream mech-servicename'
```

## 🔄 Updates and Rollbacks

### Update Service
```bash
# Just run the deploy script again
./deploy-local-docker.sh mech-servicename DROPLET_IP PORT
```

### Rollback
```bash
# Keep previous image tags with timestamps
docker build -t mech-service:$(date +%Y%m%d-%H%M%S) .

# Rollback to previous version
ssh root@DROPLET_IP 'docker run -d --name mech-service ... mech-service:20250804-1200'
```

## 🎓 For AI Agents

When deploying services:

1. **Always use the standardized script**: `./deploy-local-docker.sh`
2. **Check the deployment matrix** above for correct ports and IPs
3. **Verify the service is healthy** after deployment
4. **Update the registry** to reflect the new deployment status
5. **Document any issues** encountered for future reference

The script handles:
- ✅ Architecture detection and correct building
- ✅ Stopping old containers
- ✅ Environment file creation
- ✅ Health checks
- ✅ Registry updates
- ✅ Comprehensive error handling

No need to manually:
- ❌ Check architectures
- ❌ Build for specific platforms
- ❌ Create complex SSH commands
- ❌ Handle container cleanup