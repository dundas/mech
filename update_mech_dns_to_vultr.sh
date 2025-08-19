#!/bin/bash

echo "🌐 Updating MECH Services DNS to Vultr Server"
echo "============================================="

# Configuration
VULTR_IP="207.148.31.73"  # Updated with actual Vultr server IP
ZONE_ID="b5b29e72cc409e7c8d22f2896b5cde09"

# Get token from environment
TOKEN="${CLOUDFLARE_API_TOKEN}"

if [ -z "$TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN environment variable not set"
    echo "💡 Set it with: export CLOUDFLARE_API_TOKEN=your_token"
    exit 1
fi

echo "✅ Using Cloudflare OAuth token"
echo "🎯 Zone ID: $ZONE_ID"
echo "🖥️  Target IP: $VULTR_IP"
echo ""

# MECH Services to update
SERVICES=(
    "storage"
    "indexer"
    "sequences"
    "search"
    "reader"
    "queue"
    "llm"
    "machines"
    "memories"
)

# Function to get existing record ID
get_record_id() {
    local name=$1
    
    response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${name}.mech.is&type=A" \
         -H "Authorization: Bearer ${TOKEN}" \
         -H "Content-Type: application/json")
    
    echo "$response" | jq -r '.result[0].id // empty'
}

# Function to update DNS record
update_dns_record() {
    local name=$1
    local ip=$2
    
    echo "🔍 Checking ${name}.mech.is..."
    
    # Get existing record ID
    record_id=$(get_record_id "$name")
    
    if [ -z "$record_id" ]; then
        # Create new record
        echo "   📝 Creating new record: ${name}.mech.is -> ${ip}"
        
        response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
             -H "Authorization: Bearer ${TOKEN}" \
             -H "Content-Type: application/json" \
             --data "{
               \"type\": \"A\",
               \"name\": \"${name}\",
               \"content\": \"${ip}\",
               \"proxied\": true,
               \"comment\": \"MECH ${name} service - Vultr deployment\"
             }")
    else
        # Update existing record
        echo "   🔄 Updating existing record: ${name}.mech.is -> ${ip}"
        
        response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${record_id}" \
             -H "Authorization: Bearer ${TOKEN}" \
             -H "Content-Type: application/json" \
             --data "{
               \"type\": \"A\",
               \"name\": \"${name}\",
               \"content\": \"${ip}\",
               \"proxied\": true,
               \"comment\": \"MECH ${name} service - Vultr deployment\"
             }")
    fi
    
    success=$(echo "$response" | jq -r '.success')
    if [ "$success" = "true" ]; then
        echo "   ✅ Success"
    else
        echo "   ❌ Failed:"
        echo "$response" | jq '.errors[]?'
    fi
    echo ""
}

# Update all DNS records
echo "📋 Updating DNS records for all services..."
echo ""

for service in "${SERVICES[@]}"; do
    update_dns_record "$service" "$VULTR_IP"
done

echo "🎉 DNS update complete!"
echo ""
echo "All MECH services now point to: $VULTR_IP"
echo ""
echo "Services will be available at:"
for service in "${SERVICES[@]}"; do
    echo "  https://${service}.mech.is -> $VULTR_IP"
done
echo ""
echo "Note: DNS propagation may take 1-5 minutes"