#!/bin/bash

# Comprehensive Mech Services Testing Script  
# Tests all services for operational status, health, and basic functionality

set -e

# Check for bash version 4+ for associative arrays
if ((BASH_VERSINFO[0] < 4)); then
    echo "Error: This script requires Bash 4.0 or higher for associative arrays"
    echo "Current version: $BASH_VERSION"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }
print_header() { echo -e "\n${CYAN}=== $1 ===${NC}\n"; }

# Configuration
SERVER_IP="207.148.31.73"
SSH_KEY="~/.ssh/vultr_mech_machines"

# Service definitions with detailed test configurations
declare -A SERVICES=(
    ["mech-storage"]="3007:/health:Storage service for file management"
    ["mech-queue"]="3003:/health:Background job processing"
    ["mech-llms"]="3008:/health:AI model integration service"
    ["mech-reader"]="3001:/health:Content processing service"
    ["mech-indexer"]="3005:/:Code indexing and search (web UI)"
    ["mech-search"]="3009:/health:Web search service"
    ["mech-sequences"]="3004:/health:Workflow orchestration"
    ["mech-memories"]="3010:/health:Memory storage for AI agents"
)

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
declare -a FAILED_SERVICES
declare -a TEST_RESULTS

print_header "Mech Services Comprehensive Testing"
echo "Server: $SERVER_IP"
echo "Testing $(echo ${!SERVICES[@]} | wc -w) services"
echo ""

# Function to test basic connectivity
test_connectivity() {
    print_header "Network Connectivity Tests"
    
    # Test SSH connectivity
    print_info "Testing SSH connection to server..."
    if timeout 10 ssh -i $SSH_KEY -o ConnectTimeout=5 root@$SERVER_IP "echo 'SSH OK'" >/dev/null 2>&1; then
        print_status "SSH connection successful"
    else
        print_error "SSH connection failed"
        echo "Cannot proceed with server-side tests"
        exit 1
    fi
    
    # Test basic HTTP connectivity
    print_info "Testing basic HTTP connectivity..."
    if timeout 10 curl -s "http://$SERVER_IP" >/dev/null 2>&1; then
        print_status "HTTP connectivity confirmed"
    else
        print_warning "HTTP connection timeout (may be normal)"
    fi
}

# Function to test individual service health
test_service_health() {
    local service=$1
    local config=${SERVICES[$service]}
    local port=$(echo $config | cut -d':' -f1)
    local endpoint=$(echo $config | cut -d':' -f2)
    local description=$(echo $config | cut -d':' -f3-)
    
    print_info "Testing $service ($description)"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test direct IP access
    local url="http://$SERVER_IP:$port$endpoint"
    local response=$(timeout 15 curl -s -o /dev/null -w "%{http_code}|%{time_total}" "$url" 2>/dev/null || echo "000|0")
    local http_code=$(echo $response | cut -d'|' -f1)
    local response_time=$(echo $response | cut -d'|' -f2)
    
    if [[ "$http_code" == "200" ]]; then
        print_status "$service - HTTP $http_code (${response_time}s)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("✅ $service:$port - OK (${response_time}s)")
    else
        print_error "$service - HTTP $http_code (${response_time}s)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_SERVICES+=("$service")
        TEST_RESULTS+=("❌ $service:$port - FAILED ($http_code)")
    fi
}

# Function to test HTTPS domains (if DNS is configured)
test_https_domains() {
    print_header "HTTPS Domain Tests"
    
    for service in "${!SERVICES[@]}"; do
        local service_name=${service#mech-}  # Remove 'mech-' prefix
        local domain="${service_name}.mech.is"
        
        print_info "Testing HTTPS for $domain..."
        
        # Test HTTPS connectivity
        local response=$(timeout 15 curl -s -o /dev/null -w "%{http_code}" "https://$domain/health" 2>/dev/null || echo "000")
        
        if [[ "$response" == "200" ]]; then
            print_status "$domain - HTTPS working"
        else
            print_warning "$domain - HTTPS not accessible (HTTP $response)"
        fi
    done
}

# Function to test service interactions
test_service_integrations() {
    print_header "Service Integration Tests"
    
    # Test storage service file operations
    print_info "Testing storage service functionality..."
    local storage_test=$(timeout 10 curl -s "http://$SERVER_IP:3007/health" 2>/dev/null | grep -o "storage\|healthy\|ok" | head -1)
    if [[ ! -z "$storage_test" ]]; then
        print_status "Storage service responding with valid data"
    else
        print_warning "Storage service response unclear"
    fi
    
    # Test queue service status
    print_info "Testing queue service functionality..."
    local queue_test=$(timeout 10 curl -s "http://$SERVER_IP:3003/health" 2>/dev/null | grep -o "queue\|healthy\|ok" | head -1)
    if [[ ! -z "$queue_test" ]]; then
        print_status "Queue service responding with valid data"
    else
        print_warning "Queue service response unclear"
    fi
    
    # Test LLM service availability
    print_info "Testing LLM service functionality..."
    local llm_test=$(timeout 15 curl -s "http://$SERVER_IP:3008/health" 2>/dev/null | grep -o "llm\|model\|healthy\|ok" | head -1)
    if [[ ! -z "$llm_test" ]]; then
        print_status "LLM service responding with valid data"
    else
        print_warning "LLM service response unclear"
    fi
}

# Function to test server-side container status
test_container_status() {
    print_header "Container Status Check"
    
    print_info "Checking Docker containers on server..."
    
    # Get container status from server
    local container_status=$(ssh -i $SSH_KEY root@$SERVER_IP "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" 2>/dev/null)
    
    echo "Current containers:"
    echo "$container_status"
    echo ""
    
    # Check if all expected services are running
    for service in "${!SERVICES[@]}"; do
        if echo "$container_status" | grep -q "$service"; then
            print_status "$service container is running"
        else
            print_error "$service container not found"
            FAILED_SERVICES+=("$service-container")
        fi
    done
}

# Function to test resource usage
test_resource_usage() {
    print_header "Server Resource Usage"
    
    print_info "Checking server resources..."
    
    # Get resource information
    local resource_info=$(ssh -i $SSH_KEY root@$SERVER_IP "echo 'CPU Usage:'; top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | cut -d'%' -f1; echo 'Memory Usage:'; free | grep Mem | awk '{printf \"%.1f%%\", \$3/\$2 * 100.0}'; echo ''; echo 'Disk Usage:'; df -h / | awk 'NR==2{printf \"%s\", \$5}'" 2>/dev/null)
    
    echo "Resource Status:"
    echo "$resource_info"
    echo ""
}

# Function to generate detailed report
generate_report() {
    print_header "Test Results Summary"
    
    echo "📊 Overall Results:"
    echo "   Total Tests: $TOTAL_TESTS"
    echo "   Passed: $PASSED_TESTS"
    echo "   Failed: $FAILED_TESTS"
    echo "   Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    echo ""
    
    if [[ ${#TEST_RESULTS[@]} -gt 0 ]]; then
        echo "📋 Detailed Results:"
        for result in "${TEST_RESULTS[@]}"; do
            echo "   $result"
        done
        echo ""
    fi
    
    if [[ ${#FAILED_SERVICES[@]} -gt 0 ]]; then
        echo "🔧 Failed Services (require attention):"
        for service in "${FAILED_SERVICES[@]}"; do
            echo "   - $service"
        done
        echo ""
        
        echo "🛠️  Troubleshooting Steps:"
        echo "   1. Check container logs: ssh -i $SSH_KEY root@$SERVER_IP 'docker logs <service>'"
        echo "   2. Restart failed services: ssh -i $SSH_KEY root@$SERVER_IP 'docker restart <service>'"
        echo "   3. Check service configuration and environment variables"
        echo "   4. Verify network connectivity and port accessibility"
    fi
    
    # Generate timestamp report
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "📅 Test completed at: $timestamp"
    
    # Save results to file
    {
        echo "# Mech Services Test Report - $timestamp"
        echo ""
        echo "## Summary"
        echo "- Total Tests: $TOTAL_TESTS"
        echo "- Passed: $PASSED_TESTS"
        echo "- Failed: $FAILED_TESTS"
        echo "- Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
        echo ""
        echo "## Test Results"
        for result in "${TEST_RESULTS[@]}"; do
            echo "- $result"
        done
        echo ""
        if [[ ${#FAILED_SERVICES[@]} -gt 0 ]]; then
            echo "## Failed Services"
            for service in "${FAILED_SERVICES[@]}"; do
                echo "- $service"
            done
        fi
    } > "test-results-$(date +%Y%m%d-%H%M%S).md"
    
    print_info "Test report saved to test-results-$(date +%Y%m%d-%H%M%S).md"
}

# Main testing sequence
main() {
    # Run all tests
    test_connectivity
    test_container_status
    
    print_header "Individual Service Health Tests"
    for service in $(printf '%s\n' "${!SERVICES[@]}" | sort); do
        test_service_health "$service"
    done
    
    test_https_domains
    test_service_integrations
    test_resource_usage
    
    # Generate final report
    generate_report
    
    # Exit with appropriate code
    if [[ $FAILED_TESTS -eq 0 ]]; then
        print_header "🎉 All Tests Passed!"
        exit 0
    else
        print_header "⚠️  Some Tests Failed - Review Results Above"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "--quick")
        print_info "Running quick health checks only..."
        test_connectivity
        for service in "${!SERVICES[@]}"; do
            test_service_health "$service"
        done
        generate_report
        ;;
    "--help")
        echo "Mech Services Testing Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --quick    Run quick health checks only"
        echo "  --help     Show this help message"
        echo ""
        echo "Default: Run comprehensive test suite"
        ;;
    *)
        main
        ;;
esac