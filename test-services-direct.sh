#!/bin/bash

# Direct Mech Services Health Check (HTTP only)
# Tests services without requiring SSH

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }
print_header() { echo -e "\n${BLUE}=== $1 ===${NC}\n"; }

# Configuration
SERVER_IP="207.148.31.73"

print_header "Mech Services Health Check"
echo "Server: $SERVER_IP"
echo "Testing all services via HTTP..."

# Test function
test_service() {
    local name=$1
    local port=$2
    local endpoint=$3
    local description=$4
    
    print_info "Testing $name ($description) on port $port"
    
    local url="http://$SERVER_IP:$port$endpoint"
    local response=$(timeout 15 curl -s -o /dev/null -w "%{http_code}|%{time_total}" "$url" 2>/dev/null || echo "000|timeout")
    local http_code=$(echo $response | cut -d'|' -f1)
    local time=$(echo $response | cut -d'|' -f2)
    
    if [ "$http_code" = "200" ]; then
        print_status "$name - OK (${time}s) - $url"
    else
        print_error "$name - FAILED (HTTP $http_code) - $url"
    fi
}

print_header "Individual Service Tests"

# Test each service
test_service "mech-storage" "3007" "/health" "File storage service"
test_service "mech-queue" "3003" "/health" "Background job processing" 
test_service "mech-llms" "3008" "/health" "AI model integration"
test_service "mech-reader" "3001" "/health" "Content processing"
test_service "mech-indexer" "3005" "/" "Code indexing (web UI)"
test_service "mech-search" "3009" "/health" "Web search service"
test_service "mech-sequences" "3004" "/health" "Workflow orchestration"
test_service "mech-memories" "3010" "/health" "Memory storage"

print_header "HTTPS Domain Tests"

# Test HTTPS domains
domains="storage.mech.is:Storage queue.mech.is:Queue llm.mech.is:LLMs reader.mech.is:Reader indexer.mech.is:Indexer search.mech.is:Search sequences.mech.is:Sequences memories.mech.is:Memories"

for domain_desc in $domains; do
    domain=$(echo $domain_desc | cut -d':' -f1)
    desc=$(echo $domain_desc | cut -d':' -f2)
    
    print_info "Testing HTTPS for $domain"
    
    # Try health endpoint first, then root
    if timeout 10 curl -s -o /dev/null "https://$domain/health" 2>/dev/null; then
        print_status "$desc - HTTPS /health accessible"
    elif timeout 10 curl -s -o /dev/null "https://$domain/" 2>/dev/null; then
        print_status "$desc - HTTPS root accessible"
    else
        print_error "$desc - HTTPS not accessible at $domain"
    fi
done

print_header "Quick Server Info"

# Basic server connectivity
if timeout 5 curl -s -o /dev/null "http://$SERVER_IP" 2>/dev/null; then
    print_status "Server HTTP connectivity confirmed"
else
    print_info "Server does not respond to root HTTP (normal)"
fi

print_header "Test Summary"
echo "Individual results shown above"
echo ""
echo "For container status, SSH to server:"
echo "ssh -i ~/.ssh/vultr_mech_machines root@$SERVER_IP 'docker ps'"
echo ""
echo "All services should show HTTP 200 for /health endpoints"