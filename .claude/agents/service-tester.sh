#!/bin/bash
# Quality & Validation Agent - Service Testing Script
# Tests all Mech services for operational status

SERVER_IP="207.148.31.73"
SSH_KEY="$HOME/.ssh/vultr_mech_machines"

echo "🧪 Quality & Validation Agent - Service Health Check"
echo "=================================================="

# Test each service
echo "Testing mech-reader (File Processing)..."
READER_STATUS=$(ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s localhost:3001/health" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "Status: $READER_STATUS"

echo "Testing mech-indexer (Code Indexer)..."
INDEXER_STATUS=$(ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s localhost:3003/health" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "Status: $INDEXER_STATUS"

echo "Testing mech-storage (Storage)..."
STORAGE_STATUS=$(ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s localhost:3004/health" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "Status: $STORAGE_STATUS"

echo "Testing mech-sequences (Workflow)..."
SEQUENCES_STATUS=$(ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s localhost:3005/health" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "Status: $SEQUENCES_STATUS"

echo "Testing mech-llms (LLM Service)..."
LLMS_STATUS=$(ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s localhost:3007/health" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "Status: $LLMS_STATUS"

echo "Testing mech-analyzer (DB Analyzer)..."
ANALYZER_STATUS=$(ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s localhost:3008/health" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "Status: $ANALYZER_STATUS"

echo "Testing mech-registry (Registry)..."
REGISTRY_STATUS=$(ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s localhost:3009/health" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "Status: $REGISTRY_STATUS"

echo "Testing mech-memories (Memory Service)..."
MEMORIES_STATUS=$(ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s localhost:3010/health" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "Status: $MEMORIES_STATUS"

echo ""
echo "📊 Summary:"
echo "=========="

# Count healthy vs unhealthy
HEALTHY_COUNT=0
UNHEALTHY_COUNT=0
DOWN_COUNT=0

for status in "$READER_STATUS" "$INDEXER_STATUS" "$STORAGE_STATUS" "$SEQUENCES_STATUS" "$LLMS_STATUS" "$ANALYZER_STATUS" "$REGISTRY_STATUS" "$MEMORIES_STATUS"; do
    if [ "$status" = "healthy" ]; then
        HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
    elif [ "$status" = "unhealthy" ]; then
        UNHEALTHY_COUNT=$((UNHEALTHY_COUNT + 1))
    else
        DOWN_COUNT=$((DOWN_COUNT + 1))
    fi
done

echo "✅ Healthy: $HEALTHY_COUNT"
echo "⚠️  Unhealthy: $UNHEALTHY_COUNT" 
echo "❌ Down: $DOWN_COUNT"

if [ $DOWN_COUNT -eq 0 ] && [ $UNHEALTHY_COUNT -eq 0 ]; then
    echo "🎉 All services operational!"
    exit 0
elif [ $DOWN_COUNT -eq 0 ]; then
    echo "⚠️  All services responding but some have health issues"
    exit 1
else
    echo "❌ Some services are down"
    exit 2
fi