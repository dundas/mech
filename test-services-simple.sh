#!/bin/bash

# Simple Mech Services Health Check
# Compatible with all bash versions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }
print_header() { echo -e "\n${BLUE}=== $1 ===${NC}\n"; }

# Configuration
SERVER_IP="207.148.31.73"
SSH_KEY="$HOME/.ssh/vultr_mech_machines"

# Service list (name:port:endpoint:description)
SERVICES="
mech-storage:3007:/health:Storage service
mech-queue:3003:/health:Job processing
mech-llms:3008:/health:AI models
mech-reader:3001:/health:Content processing
mech-indexer:3005:/:Code indexing
mech-search:3009:/health:Web search
mech-sequences:3004:/health:Workflow orchestration
mech-memories:3010:/health:Memory storage
"

PASSED=0
FAILED=0
TOTAL=0

print_header "Mech Services Health Check"
echo "Server: $SERVER_IP"
echo "$(echo "$SERVICES" | grep -c ':'| head -1) services to test"

# Test SSH connectivity first
print_info "Testing SSH connection..."
if timeout 10 ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$SERVER_IP "echo 'SSH OK'" >/dev/null 2>&1; then
    print_status "SSH connection successful"
else
    print_error "SSH connection failed - cannot proceed"
    exit 1
fi

print_header "Service Health Tests"

# Test each service
echo "$SERVICES" | while IFS=':' read -r service port endpoint description; do
    if [ -z "$service" ]; then continue; fi
    
    TOTAL=$((TOTAL + 1))
    print_info "Testing $service ($description)"
    
    url="http://$SERVER_IP:$port$endpoint"
    response=$(timeout 15 curl -s -o /dev/null -w "%{http_code}|%{time_total}" "$url" 2>/dev/null || echo "000|0")
    http_code=$(echo $response | cut -d'|' -f1)
    response_time=$(echo $response | cut -d'|' -f2)
    
    if [ "$http_code" = "200" ]; then
        print_status "$service - OK (${response_time}s)"
        PASSED=$((PASSED + 1))
    else
        print_error "$service - FAILED (HTTP $http_code)"
        FAILED=$((FAILED + 1))
    fi
done

# Container status check
print_header "Container Status"
print_info "Checking running containers..."

container_output=$(ssh -i $SSH_KEY root@$SERVER_IP "docker ps --format 'table {{.Names}}\t{{.Status}}'" 2>/dev/null || echo "Failed to connect")

if [ "$container_output" != "Failed to connect" ]; then
    echo "$container_output"
else
    print_error "Could not retrieve container status"
fi

print_header "Summary"
echo "Services tested: 8"
echo "Note: Individual test results shown above"

# Quick domain test
print_header "Quick HTTPS Domain Test"
domains="storage.mech.is queue.mech.is llm.mech.is reader.mech.is indexer.mech.is search.mech.is sequences.mech.is memories.mech.is"

for domain in $domains; do
    if timeout 10 curl -s "https://$domain/health" >/dev/null 2>&1 || timeout 10 curl -s "https://$domain/" >/dev/null 2>&1; then
        print_status "$domain - HTTPS accessible"
    else
        print_error "$domain - HTTPS not accessible"
    fi
done

print_header "Test Complete"
echo "Check individual service results above"
echo "For detailed testing, use: ./test-all-mech-services.sh"