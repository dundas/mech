# Mech Services Monitoring & Scaling Strategy

## Current Infrastructure Analysis

### Server Resources (207.148.31.73)
- **CPU**: Load average 0.34-0.45 (good, under 1.0)
- **Memory**: 458Mi/951Mi used (48% - moderate usage)
- **Disk**: 11G/23G used (51% - needs attention)
- **Uptime**: 5+ days (stable)

### Service Resource Usage

| Service | CPU % | Memory | Status | Priority | Risk Level |
|---------|-------|--------|--------|----------|------------|
| mech-reader | 1.79% | 41.7MB (4.38%) | Healthy | High | Low |
| mech-queue | 1.13% | 26.67MB (2.80%) | Healthy | Critical | Medium |
| mech-sequences | 0.20% | 46.5MB (4.89%) | Healthy | High | Low |
| mech-indexer | 0.00% | 40.65MB (4.27%) | Healthy | High | Low |
| mech-storage | 0.60% | 35.27MB (3.71%) | Healthy | Critical | Medium |
| mech-llms | 0.00% | 35.21MB (3.70%) | Healthy | High | High |
| mech-memories | 0.00% | 33.58MB (3.53%) | Healthy | Medium | Low |
| mech-search | 0.00% | 16.36MB (1.72%) | Partial | Low | Low |
| redis-temp | 0.79% | 5.2MB (0.55%) | Support | Critical | High |

## Monitoring Architecture

### 1. Three-Tier Monitoring System

#### Tier 1: Health Checks (Every 30s)
```yaml
monitors:
  critical_services:
    - mech-queue: "http://localhost:3003/health"
    - mech-storage: "http://localhost:3007/health"
    - redis: "redis-cli ping"
  alerting:
    - failure_threshold: 2 consecutive checks
    - action: immediate alert + auto-restart
```

#### Tier 2: Performance Metrics (Every 5m)
```yaml
metrics:
  - response_time_p95
  - error_rate
  - throughput
  - queue_depth
  alerting:
    - response_time > 1s: warning
    - response_time > 3s: critical
    - error_rate > 2%: warning
    - error_rate > 5%: critical
```

#### Tier 3: Resource Monitoring (Every 15m)
```yaml
resources:
  - cpu_usage
  - memory_usage
  - disk_usage
  - network_io
  alerting:
    - cpu > 80%: warning
    - memory > 85%: warning
    - disk > 80%: critical
```

## Service Graduation Analysis

### Services Requiring Dedicated Servers

#### 1. **mech-llms** (Highest Priority for Graduation)
**Reasons:**
- High computational requirements for AI models
- Memory-intensive operations (will scale with usage)
- Network latency sensitive
- Single point of failure for AI capabilities

**Recommendation:** Graduate to dedicated 2GB+ server with GPU access if possible

#### 2. **mech-storage + mech-queue** (Co-locate on Dedicated Server)
**Reasons:**
- Both are critical infrastructure services
- Queue requires Redis (currently temporary container)
- Storage handles all file operations
- Both need persistent volumes and backups

**Recommendation:** Graduate together to dedicated 1GB server with SSD storage

### Services That Should Remain on Current Server

#### Keep on 207.148.31.73:
- **mech-reader**: Low resource usage, stateless
- **mech-indexer**: Low resource usage, benefits from proximity to storage
- **mech-sequences**: Low resource usage, orchestration only
- **mech-memories**: Low resource usage, simple storage
- **mech-search**: Minimal usage, optional service

## Implementation Plan

### Phase 1: Immediate Monitoring Setup (Week 1)

```bash
#!/bin/bash
# monitoring-setup.sh

# 1. Install monitoring agent
apt-get update && apt-get install -y prometheus-node-exporter

# 2. Setup health check cron
cat > /etc/cron.d/mech-health << 'EOF'
*/1 * * * * root /opt/mech/health-check.sh
*/5 * * * * root /opt/mech/metrics-collector.sh
*/15 * * * * root /opt/mech/resource-monitor.sh
EOF

# 3. Create health check script
cat > /opt/mech/health-check.sh << 'EOF'
#!/bin/bash
SERVICES="3003 3007 6379"
for PORT in $SERVICES; do
  if ! nc -z localhost $PORT; then
    echo "$(date): Service on port $PORT is down" >> /var/log/mech-health.log
    # Trigger alert
    curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"CRITICAL: Service on port $PORT is down on 207.148.31.73\"}"
  fi
done
EOF
chmod +x /opt/mech/health-check.sh
```

### Phase 2: Monitoring Dashboard (Week 2)

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prometheus/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
    volumes:
      - grafana_data:/var/lib/grafana

  alertmanager:
    image: prometheus/alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
```

### Phase 3: Service Graduation (Week 3-4)

#### New Server Architecture

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   LLM Server (New)      │     │  Storage Server (New)   │
│   - mech-llms           │     │  - mech-storage         │
│   - 2GB RAM minimum     │     │  - mech-queue           │
│   - GPU if available    │     │  - Redis/Valkey         │
└─────────────────────────┘     └─────────────────────────┘
            ↕                                ↕
┌────────────────────────────────────────────────────────┐
│            Original Server (207.148.31.73)             │
│  - mech-reader    - mech-sequences   - mech-search     │
│  - mech-indexer   - mech-memories    - monitoring      │
└────────────────────────────────────────────────────────┘
```

## Automation Scripts

### 1. Auto-Recovery Script
```bash
#!/bin/bash
# /opt/mech/auto-recovery.sh

check_and_restart() {
  SERVICE=$1
  PORT=$2
  
  if ! curl -sf "http://localhost:$PORT/health" > /dev/null; then
    echo "$(date): Restarting $SERVICE" >> /var/log/mech-recovery.log
    docker restart $SERVICE
    sleep 30
    
    if ! curl -sf "http://localhost:$PORT/health" > /dev/null; then
      echo "$(date): Failed to recover $SERVICE" >> /var/log/mech-recovery.log
      # Send critical alert
    fi
  fi
}

# Check all services
check_and_restart "mech-queue" "3003"
check_and_restart "mech-storage" "3007"
check_and_restart "mech-llms" "3008"
```

### 2. Capacity Planning Script
```bash
#!/bin/bash
# /opt/mech/capacity-monitor.sh

# Calculate growth rate
CURRENT_DISK=$(df / | awk 'NR==2 {print $3}')
echo "$(date),$CURRENT_DISK" >> /var/log/disk-usage.csv

# Predict when disk will be full
tail -30 /var/log/disk-usage.csv | awk -F, '
  NR==1 {first=$2; first_time=$1} 
  END {
    growth_rate = ($2 - first) / NR;
    days_until_full = (23000000 - $2) / growth_rate;
    if (days_until_full < 30) {
      print "WARNING: Disk will be full in " days_until_full " days"
    }
  }'
```

## Monitoring Dashboards

### Critical Service Dashboard
- Real-time health status (green/yellow/red)
- Response time graphs (last 24h)
- Error rate trends
- Queue depth visualization
- Active connections count

### Infrastructure Dashboard
- CPU usage per container
- Memory usage trends
- Disk I/O patterns
- Network traffic analysis
- Container restart history

### Business Metrics Dashboard
- Request throughput
- Processing success rate
- Average processing time
- Queue backlog trends
- Service dependencies map

## Alert Configuration

### Critical Alerts (Immediate Action)
```yaml
alerts:
  - name: ServiceDown
    condition: health_check_failed > 2min
    action: 
      - auto_restart
      - page_oncall
      - slack_critical_channel
  
  - name: DiskFull
    condition: disk_usage > 90%
    action:
      - page_oncall
      - emergency_cleanup_script
      - scale_storage_server
```

### Warning Alerts (Monitor Closely)
```yaml
alerts:
  - name: HighMemory
    condition: memory_usage > 85%
    action:
      - slack_ops_channel
      - schedule_investigation
  
  - name: SlowResponse
    condition: p95_response_time > 2s
    action:
      - slack_dev_channel
      - capture_performance_trace
```

## Cost-Benefit Analysis

### Current Setup (Single Server)
- **Cost**: ~$6/month (1GB Vultr instance)
- **Risk**: Single point of failure, resource contention
- **Suitable for**: Development, small-scale production

### Recommended Setup (3 Servers)
- **Main Server**: $6/month (existing)
- **LLM Server**: $12/month (2GB instance)
- **Storage Server**: $6/month (1GB instance)
- **Total**: $24/month
- **Benefits**: 
  - Service isolation
  - Better scaling
  - Reduced failure impact
  - Performance optimization

### ROI Justification
- Prevents downtime (worth $100s/hour for production)
- Enables horizontal scaling
- Improves response times by 50%
- Reduces debugging time
- Allows independent service updates

## Next Steps

1. **Immediate** (Today):
   - Deploy health check scripts
   - Setup basic alerting via curl/webhook
   - Document current baseline metrics

2. **Short-term** (Week 1):
   - Deploy Prometheus + Grafana
   - Configure alertmanager
   - Create runbooks for common issues

3. **Medium-term** (Week 2-3):
   - Provision new servers for LLM and Storage
   - Migrate services with zero downtime
   - Setup cross-server monitoring

4. **Long-term** (Month 2):
   - Implement auto-scaling policies
   - Setup disaster recovery
   - Optimize based on collected metrics

## Monitoring Checklist

- [ ] Health endpoints on all services
- [ ] Prometheus node exporter installed
- [ ] Grafana dashboards configured
- [ ] Alert rules defined
- [ ] Slack/email notifications setup
- [ ] Auto-recovery scripts deployed
- [ ] Backup strategy implemented
- [ ] Capacity planning automated
- [ ] Runbooks documented
- [ ] Team trained on procedures