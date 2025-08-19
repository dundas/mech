# Mech Platform - Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting procedures for the Mech platform based on real deployment experience. It addresses the most common issues encountered and provides proven solutions.

## 🚨 Quick Diagnostic Commands

### Platform Health Check
```bash
# Run comprehensive health check
./test-all-services.sh

# Or manual checks
for service in queue llm storage indexer sequences search reader memories; do
    echo "=== $service ==="
    curl -s https://$service.mech.is/health | jq '.' || echo "FAILED"
done
```

### System Status Overview
```bash
# Container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# System resources
free -h && df -h

# Network status
ss -tlnp | grep -E "(3001|3002|3004|3005|3007|3008|3009|3010)"

# Firewall status
sudo ufw status numbered
```

## 🔥 Critical Issues (Emergency Response)

### Issue 1: All Services Unreachable (522/524 Errors)

**Symptoms:**
- All services return 522 Bad Gateway or 524 Timeout errors
- Services appear running in `docker ps`
- Internal health checks work but external access fails

**Root Cause:** UFW Firewall blocking HTTP/HTTPS traffic

**Immediate Fix:**
```bash
# SSH into server
ssh -i ~/.ssh/vultr_mech_machines root@207.148.31.73

# Check firewall status
sudo ufw status

# Add essential rules
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Verify fix
curl https://llm.mech.is/health
```

**Prevention:**
```bash
# Always configure firewall rules during infrastructure setup
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3001:3010/tcp  # Service ports
sudo ufw --force enable
```

### Issue 2: Service Discovery Failures

**Symptoms:**
- Services cannot communicate with each other
- Database connection errors
- Redis connection timeouts

**Root Cause:** Docker network misconfiguration

**Immediate Fix:**
```bash
# Check Docker network
docker network ls | grep mech-network

# Create network if missing
docker network create mech-network

# Connect existing containers
for container in $(docker ps --format "{{.Names}}" | grep mech-); do
    docker network connect mech-network $container || true
done

# Restart services
docker restart $(docker ps --format "{{.Names}}" | grep mech-)
```

**Prevention:**
```bash
# Always use --network mech-network in docker run commands
docker run -d --name service --network mech-network ...
```

### Issue 3: SSL/TLS Certificate Errors

**Symptoms:**
- SSL handshake failures
- Certificate validation errors
- Mixed content warnings

**Root Cause:** Cloudflare SSL mode misconfiguration

**Immediate Fix:**
1. Go to Cloudflare Dashboard → SSL/TLS → Overview
2. Set SSL mode to **"Flexible"**
3. Enable "Always Use HTTPS"
4. Wait 1-5 minutes for propagation

**Verification:**
```bash
# Test SSL
curl -I https://service.mech.is/health

# Check certificate
openssl s_client -connect service.mech.is:443 -servername service.mech.is
```

## 🔧 Service-Specific Issues

### mech-llms Service Issues

#### Issue: API Key Errors
**Symptoms:**
```
Error: Missing OPENAI_API_KEY
Error: Invalid API key provided
```

**Solution:**
```bash
# Check environment variables
docker exec mech-llms env | grep -E "(OPENAI|ANTHROPIC)"

# Update API keys
docker exec -it mech-llms sh
# Edit /opt/mech-services/mech-llms/.env
# Restart container
docker restart mech-llms
```

#### Issue: Model Loading Failures
**Symptoms:**
```
Error: Could not load model
Timeout waiting for model response
```

**Solution:**
```bash
# Check model availability
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "test"}]}'

# Check service logs
docker logs mech-llms --tail 50

# Restart if needed
docker restart mech-llms
```

### mech-indexer Service Issues

#### Issue: GitHub Token Errors
**Symptoms:**
```
Error: Bad credentials
Error: API rate limit exceeded
```

**Solution:**
```bash
# Verify GitHub token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Update token in environment
docker exec -it mech-indexer sh
# Edit .env file with new token
# Restart service
docker restart mech-indexer
```

#### Issue: Indexing Failures
**Symptoms:**
```
Error: Failed to index repository
Timeout during file processing
```

**Solution:**
```bash
# Check disk space
df -h

# Check memory usage
docker stats mech-indexer --no-stream

# Clear temporary files
docker exec mech-indexer sh -c 'rm -rf /tmp/*'

# Restart service
docker restart mech-indexer
```

### mech-storage Service Issues

#### Issue: R2 Connection Errors
**Symptoms:**
```
Error: Access Denied
Error: Invalid bucket configuration
```

**Solution:**
```bash
# Test R2 credentials
aws s3 ls --endpoint-url=https://your-account.r2.cloudflarestorage.com \
          --profile r2

# Update R2 credentials
docker exec -it mech-storage sh
# Edit .env with correct R2_ACCESS_KEY and R2_SECRET_KEY
# Restart service
docker restart mech-storage
```

#### Issue: File Upload Failures
**Symptoms:**
```
Error: File too large
Error: Upload timeout
```

**Solution:**
```bash
# Check nginx upload limits
grep client_max_body_size /etc/nginx/nginx.conf

# Update nginx configuration
sudo nano /etc/nginx/nginx.conf
# Add: client_max_body_size 100M;
sudo nginx -t && sudo systemctl reload nginx

# Check storage service limits
docker logs mech-storage --tail 20
```

### mech-queue Service Issues

#### Issue: Redis Connection Errors
**Symptoms:**
```
Error: Redis connection refused
Error: Could not connect to Redis at redis:6379
```

**Solution:**
```bash
# Check Redis container
docker ps | grep redis

# Start Redis if not running
docker run -d --name redis --network mech-network redis:alpine

# Test Redis connectivity
docker exec mech-queue redis-cli -h redis ping

# Restart queue service
docker restart mech-queue
```

#### Issue: Job Processing Failures
**Symptoms:**
```
Error: Job timeout
Error: Worker not responding
```

**Solution:**
```bash
# Check queue status
curl https://queue.mech.is/health

# Check Redis memory
docker exec redis redis-cli info memory

# Clear stuck jobs
docker exec redis redis-cli flushall

# Restart queue service
docker restart mech-queue
```

## 🌐 Network & DNS Issues

### DNS Propagation Issues

**Symptoms:**
- Service accessible by IP but not domain
- Intermittent domain resolution

**Diagnosis:**
```bash
# Check DNS resolution
nslookup service.mech.is
dig service.mech.is

# Check from different locations
# Use online tools: https://www.whatsmydns.net/
```

**Solution:**
```bash
# Force DNS refresh
sudo systemctl flush-dns  # Ubuntu
sudo dscacheutil -flushcache  # macOS

# Check Cloudflare DNS settings
# Ensure A record points to 207.148.31.73
# Ensure proxy is enabled (orange cloud)
```

### Nginx Proxy Issues

**Symptoms:**
- 502 Bad Gateway errors
- Connection refused errors

**Diagnosis:**
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# Check upstream connectivity
curl http://localhost:3008/health
```

**Solution:**
```bash
# Reload nginx configuration
sudo systemctl reload nginx

# Restart nginx if needed
sudo systemctl restart nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Port Binding Issues

**Symptoms:**
- Container fails to start
- Port already in use errors

**Diagnosis:**
```bash
# Check what's using the port
ss -tlnp | grep :3008
sudo lsof -i :3008

# Check Docker port mappings
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

**Solution:**
```bash
# Kill process using port
sudo kill -9 $(lsof -t -i:3008)

# Or use different port in container
docker run -p 3009:3008 ...  # Map different host port
```

## 💾 Database & Storage Issues

### MongoDB Connection Issues

**Symptoms:**
- Database connection timeouts
- Authentication failures

**Diagnosis:**
```bash
# Check MongoDB container
docker ps | grep mongo

# Test MongoDB connectivity
docker exec -it mongodb mongosh
# Try: db.adminCommand('ismaster')
```

**Solution:**
```bash
# Start MongoDB if not running
docker run -d --name mongodb --network mech-network \
  -v /opt/mech-services/shared/data/mongodb:/data/db \
  mongo:latest

# Check MongoDB logs
docker logs mongodb

# Restart services that depend on MongoDB
docker restart mech-indexer mech-llms mech-queue
```

### Redis Performance Issues

**Symptoms:**
- Slow response times
- Memory warnings

**Diagnosis:**
```bash
# Check Redis memory usage
docker exec redis redis-cli info memory

# Check Redis configuration
docker exec redis redis-cli config get '*'

# Monitor Redis commands
docker exec redis redis-cli monitor
```

**Solution:**
```bash
# Clear Redis cache
docker exec redis redis-cli flushall

# Restart Redis with more memory
docker stop redis && docker rm redis
docker run -d --name redis --network mech-network \
  --memory="512m" redis:alpine

# Configure Redis persistence
docker exec redis redis-cli config set save "900 1"
```

## 🔍 Performance Issues

### High CPU Usage

**Diagnosis:**
```bash
# Check container CPU usage
docker stats --no-stream

# Check system CPU
top -p $(docker inspect -f '{{.State.Pid}}' mech-llms)

# Check for CPU-intensive processes
ps aux --sort=-%cpu | head -10
```

**Solution:**
```bash
# Limit container CPU
docker update --cpus="1.0" mech-llms

# Restart high-CPU containers
docker restart mech-llms

# Scale horizontally if needed
docker run -d --name mech-llms-2 ... mech-llms:latest
```

### Memory Issues

**Diagnosis:**
```bash
# Check memory usage
free -h
docker stats --no-stream

# Check for memory leaks
docker exec mech-llms ps aux --sort=-%mem
```

**Solution:**
```bash
# Restart memory-heavy containers
docker restart mech-indexer

# Increase container memory limit
docker update --memory="2g" mech-indexer

# Clean up unused Docker resources
docker system prune -f
```

### Disk Space Issues

**Diagnosis:**
```bash
# Check disk usage
df -h
docker system df

# Check log file sizes
du -sh /var/log/*
du -sh /opt/mech-services/*/logs/*
```

**Solution:**
```bash
# Clean Docker resources
docker system prune -a -f

# Rotate logs
sudo logrotate -f /etc/logrotate.conf

# Clear old container logs
for container in $(docker ps -q); do
    docker logs $container --tail 0 > /dev/null 2>&1
done
```

## 🔐 Security Issues

### Certificate Expiration

**Symptoms:**
- SSL certificate warnings
- HTTPS connection failures

**Diagnosis:**
```bash
# Check certificate expiration
openssl s_client -connect service.mech.is:443 -servername service.mech.is 2>/dev/null | openssl x509 -noout -dates
```

**Solution:**
```bash
# Renew Let's Encrypt certificates
sudo certbot renew

# Or regenerate self-signed certificates
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/mech/mech.key \
    -out /etc/ssl/mech/mech.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=*.mech.is"
```

### Unauthorized Access

**Symptoms:**
- Unexpected API calls
- Authentication failures

**Solution:**
```bash
# Check nginx access logs
sudo tail -f /var/log/nginx/access.log

# Block suspicious IPs in Cloudflare
# Or add nginx rate limiting
```

## 🛠 Automated Troubleshooting

### Comprehensive Diagnostic Script
```bash
#!/bin/bash
# comprehensive-diagnostics.sh

echo "=== MECH PLATFORM DIAGNOSTICS ==="
echo "Timestamp: $(date)"
echo ""

# System health
echo "=== SYSTEM HEALTH ==="
echo "Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3"/"$2" ("$5" used)"}')"
echo "Load: $(uptime | cut -d, -f3-)"
echo ""

# Container status
echo "=== CONTAINER STATUS ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mech-
echo ""

# Service health
echo "=== SERVICE HEALTH ==="
for service in queue llm storage indexer sequences search reader memories; do
    status=$(curl -s --max-time 5 https://$service.mech.is/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "failed")
    echo "$service: $status"
done
echo ""

# Network connectivity
echo "=== NETWORK CONNECTIVITY ==="
echo "UFW Status: $(sudo ufw status | grep Status | cut -d: -f2 | xargs)"
echo "Nginx Status: $(systemctl is-active nginx)"
echo "Docker Network: $(docker network ls | grep mech-network | awk '{print $2}')"
echo ""

# Recent errors
echo "=== RECENT ERRORS ==="
for container in $(docker ps --format "{{.Names}}" | grep mech-); do
    echo "--- $container ---"
    docker logs $container --since="10m" 2>&1 | grep -i error | tail -3
done
```

### Auto-Healing Script
```bash
#!/bin/bash
# auto-heal.sh

# Check and restart unhealthy containers
for container in $(docker ps --format "{{.Names}}" | grep mech-); do
    health=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "unknown")
    if [[ "$health" != "healthy" ]]; then
        echo "Restarting unhealthy container: $container"
        docker restart $container
    fi
done

# Check critical services
critical_services=("queue" "llm" "storage")
for service in "${critical_services[@]}"; do
    if ! curl -sf https://$service.mech.is/health >/dev/null; then
        echo "Critical service $service is down, restarting..."
        docker restart mech-$service
    fi
done
```

## 📞 Escalation Procedures

### When to Escalate

1. **Data Loss**: Any indication of data corruption or loss
2. **Security Breach**: Unauthorized access or suspicious activity
3. **Multiple Service Failures**: More than 3 services down simultaneously
4. **Infrastructure Failure**: Server unresponsive or critical system failure

### Emergency Contacts

1. **Platform Administrator**: Check server access and infrastructure
2. **Development Team**: Check application-level issues
3. **Cloud Provider**: For infrastructure-level issues

### Incident Documentation

When escalating, include:
```bash
# System information
uname -a
docker version
docker ps -a
sudo ufw status
systemctl status nginx

# Service logs
for service in $(docker ps --format "{{.Names}}" | grep mech-); do
    echo "=== $service ===" >> incident-logs.txt
    docker logs $service --tail 100 >> incident-logs.txt
done

# System logs
journalctl --since="1 hour ago" >> incident-logs.txt
```

## ✅ Prevention Checklist

### Daily Checks
- [ ] All services responding to health checks
- [ ] No critical errors in logs
- [ ] System resources within normal limits
- [ ] No security alerts

### Weekly Checks
- [ ] Certificate expiration status
- [ ] Log rotation functioning
- [ ] Backup verification
- [ ] Performance metrics review

### Monthly Checks
- [ ] Security updates applied
- [ ] Documentation updated
- [ ] Disaster recovery testing
- [ ] Capacity planning review

This troubleshooting guide provides comprehensive solutions for the most common issues encountered in the Mech platform deployment and operation.