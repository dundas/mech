#!/bin/bash
# Comprehensive Mech Services Testing Script
# Tests all services with detailed health analysis

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER_IP="207.148.31.73"
SSH_KEY="$HOME/.ssh/vultr_mech_machines"

print_header() { echo -e "${BLUE}=== $1 ===${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }

# Service definitions (name:port:endpoint:description)
SERVICES="
mech-reader:3001:/health:File Processing Service
mech-indexer:3003:/health:Code Indexer Service  
mech-storage:3004:/health:Storage Service
mech-sequences:3005:/health:Workflow Service
mech-llms:3007:/health:LLM Service
mech-analyzer:3008:/health:DB Analyzer Service
mech-registry:3009:/health:Registry Service
mech-memories:3010:/health:Memory Service
"

test_service_health() {
    local name=$1
    local port=$2
    local endpoint=$3
    local description=$4
    
    print_info "Testing $name ($description) on port $port"
    
    # Test from server (more reliable)
    local response=$(ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s --max-time 10 localhost:$port$endpoint 2>/dev/null" || echo "ERROR")
    
    if [ "$response" = "ERROR" ]; then
        print_error "$name: Service not responding"
        return 1
    fi
    
    # Parse JSON response
    local status=$(echo "$response" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    local service_name=$(echo "$response" | grep -o '"service":"[^"]*' | cut -d'"' -f4)
    
    if [ "$status" = "healthy" ]; then
        print_success "$name: Healthy - $service_name"
        return 0
    elif [ "$status" = "unhealthy" ]; then
        print_warning "$name: Unhealthy but responding - $service_name"
        return 2
    else
        print_warning "$name: Unknown status - Raw response:"
        echo "   $response" | head -c 200
        return 2
    fi
}

# Main testing
print_header "Mech Services Health Check"
echo "Server: $SERVER_IP"
echo

# Test each service
healthy_count=0
unhealthy_count=0
down_count=0

echo "$SERVICES" | while IFS=: read -r name port endpoint description; do
    [ -z "$name" ] && continue
    
    test_service_health "$name" "$port" "$endpoint" "$description"
    result=$?
    
    case $result in
        0) echo "HEALTHY" > "/tmp/${name}_status" ;;
        1) echo "DOWN" > "/tmp/${name}_status" ;;
        2) echo "UNHEALTHY" > "/tmp/${name}_status" ;;
    esac
    echo
done

# Count results
healthy_count=$(find /tmp -name "*_status" -exec grep -l "HEALTHY" {} \; 2>/dev/null | wc -l)
unhealthy_count=$(find /tmp -name "*_status" -exec grep -l "UNHEALTHY" {} \; 2>/dev/null | wc -l)
down_count=$(find /tmp -name "*_status" -exec grep -l "DOWN" {} \; 2>/dev/null | wc -l)

# Cleanup
rm -f /tmp/*_status

# Summary
print_header "Summary"
print_success "Healthy services: $healthy_count"
print_warning "Unhealthy (but responding): $unhealthy_count"
print_error "Down services: $down_count"

if [ $down_count -eq 0 ]; then
    if [ $unhealthy_count -eq 0 ]; then
        print_success "All services are fully operational!"
        exit 0
    else
        print_warning "All services responding, but some have health issues"
        exit 1
    fi
else
    print_error "Some services are completely down"
    exit 2
fi
