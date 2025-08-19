# Quality & Validation Agent - Testing Commands

## Available Testing Scripts

### 1. Comprehensive Service Testing
```bash
./.claude/agents/service-tester.sh
```
**What it does:**
- Tests all 8 Mech services for health and responsiveness
- Reports healthy, unhealthy, or down status for each service
- Provides summary of overall system health

**Current Results:** 3 healthy, 5 unhealthy (queue connection issues), 0 down

**Latest Status:**
- ✅ mech-analyzer, mech-registry, mech-memories: Healthy
- ⚠️ mech-reader, mech-indexer, mech-storage, mech-sequences, mech-llms: Unhealthy (queue issues)

### 2. Quick Health Check
```bash
./test-all-mech-services.sh --quick
```
**What it does:**
- Fast health check of all services
- Basic connectivity tests
- Quick pass/fail results

### 3. Individual Service Testing
```bash
# Test specific service endpoint
curl -s -w "Status: %{http_code} | Time: %{time_total}s\n" \
  http://207.148.31.73:3007/health

# Check container status
ssh -i ~/.ssh/vultr_mech_machines root@207.148.31.73 "docker ps | grep mech-storage"
```

### 4. Performance Testing
```bash
# Load test a service (requires siege or ab)
siege -c 10 -t 30s http://207.148.31.73:3007/health

# Monitor response times
for i in {1..10}; do
  curl -s -w "Response time: %{time_total}s\n" \
    -o /dev/null http://207.148.31.73:3007/health
  sleep 1
done
```

## Service Testing Matrix

| Service | Port | Health Endpoint | Expected Response | Timeout |
|---------|------|-----------------|-------------------|---------|
| mech-storage | 3007 | /health | 200 OK | 10s |
| mech-queue | 3003 | /health | 200 OK with stats | 10s |
| mech-llms | 3008 | /health | 200 OK with models | 15s |
| mech-reader | 3001 | /health | 200 OK | 10s |
| mech-indexer | 3005 | / | 200 OK (Web UI) | 10s |
| mech-search | 3009 | /health | 200 OK | 10s |
| mech-sequences | 3004 | /health | 200 OK | 10s |
| mech-memories | 3010 | /health | 200 OK | 10s |

## Quality Gates

### Before Deployment
- [ ] All existing services pass health checks
- [ ] Container resources within limits (<80% memory, <70% CPU)
- [ ] No critical errors in logs from past 24h
- [ ] All dependencies are healthy

### After Deployment  
- [ ] New service responds to health checks within 60s
- [ ] Integration tests pass
- [ ] Performance meets baseline (response time <500ms)
- [ ] No error spikes in monitoring

### Rollback Triggers
- Service health check fails for >5 minutes
- Error rate >5% for >2 minutes  
- Response time >2x baseline for >10 minutes
- Container memory usage >90% for >5 minutes

## Automated Testing Schedule

### Continuous (Every 1 minute)
```bash
# Quick health ping for critical services
curl -sf http://207.148.31.73:3007/health > /dev/null && echo "Storage OK" || echo "Storage FAIL"
```

### Frequent (Every 15 minutes)
```bash
# Full service health check
./test-all-mech-services.sh --quick
```

### Daily (Every 24 hours)
```bash
# Comprehensive testing with report
./test-all-mech-services.sh > daily-health-$(date +%Y%m%d).log
```

### Weekly (Every 7 days)
```bash
# Performance and load testing
# Integration testing
# Security validation
```

## Alert Thresholds

### Critical (Immediate Response)
- Any service down >2 minutes
- Error rate >10% 
- Response time >5 seconds
- Memory usage >95%
- Disk usage >95%

### Warning (Monitor Closely)
- Response time >1 second
- Error rate >2%
- Memory usage >85%
- Disk usage >90%
- Any service restarting frequently

## Testing as Quality & Validation Agent

When acting as the Quality & Validation Agent:

1. **Start your session with:**
   ```bash
   echo "🧪 Quality & Validation Agent initialized"
   echo "Running baseline health check..."
   ./test-all-mech-services.sh --quick
   ```

2. **Regular monitoring:**
   ```bash
   # Every 15 minutes during active operations
   echo "$(date): Routine health check" >> .claude/quality-log.txt
   ./test-all-mech-services.sh --quick >> .claude/quality-log.txt
   ```

3. **Before approving deployments:**
   ```bash
   echo "🔍 Pre-deployment validation..."
   ./test-all-mech-services.sh
   
   # Check the exit code
   if [ $? -eq 0 ]; then
     echo "✅ System healthy - deployment approved"
   else
     echo "❌ System issues detected - deployment blocked"
   fi
   ```

4. **After deployments:**
   ```bash
   echo "🔬 Post-deployment validation..."
   sleep 60  # Wait for service to stabilize
   ./test-all-mech-services.sh
   
   # Generate deployment success report
   echo "Deployment validation completed: $(date)" >> .claude/QUALITY_STATUS.md
   ```

## Integration with Other Agents

### With Security & Infrastructure Agent
- Validate security configurations are not breaking services
- Test after credential rotations
- Confirm infrastructure changes don't impact performance

### With Service Deployment Agent  
- Approve/block deployments based on test results
- Provide rollback recommendations
- Validate deployment success

### With Documentation & Operations Agent
- Report test failures for documentation updates
- Provide data for operational dashboards
- Contribute to incident post-mortems

Remember: As the Quality & Validation Agent, you have **veto power** over deployments that fail quality standards!