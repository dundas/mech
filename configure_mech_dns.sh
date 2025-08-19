#!/bin/bash

echo "🌐 MECH Services DNS Configuration"
echo "=================================="

# Get fresh token from wrangler config
TOKEN=$(cat ~/.wrangler/config/default.toml | grep 'oauth_token = ' | cut -d'"' -f2)
ZONE_ID="b5b29e72cc409e7c8d22f2896b5cde09"

if [ -z "$TOKEN" ]; then
    echo "❌ Could not find Cloudflare token in wrangler config"
    exit 1
fi

echo "✅ Using Cloudflare OAuth token"
echo "🎯 Zone ID: $ZONE_ID"
echo ""

# MECH Services DNS mappings
declare -A SERVICES=(
    ["storage"]="167.99.50.167"
    ["indexer"]="165.227.71.77" 
    ["sequences"]="159.65.38.23"
    ["search"]="192.81.212.16"
    ["reader"]="165.227.194.103"
    ["queue"]="167.71.80.180"
    ["llm"]="64.225.3.13"
)

create_dns_record() {
    local name=$1
    local ip=$2
    
    echo "🌐 Creating: ${name}.mech.is -> ${ip}"
    
    response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
         -H "Authorization: Bearer ${TOKEN}" \
         -H "Content-Type: application/json" \
         --data "{
           \"type\": \"A\",
           \"name\": \"${name}\",
           \"content\": \"${ip}\",
           \"proxied\": true,
           \"comment\": \"MECH ${name} service\"
         }")
    
    success=$(echo "$response" | jq -r '.success')
    if [ "$success" = "true" ]; then
        echo "   ✅ Success"
    else
        echo "   ❌ Failed:"
        echo "$response" | jq '.errors[]?'
    fi
    echo ""
}

# Configure all DNS records
for service in "${!SERVICES[@]}"; do
    create_dns_record "$service" "${SERVICES[$service]}"
done

echo "🎉 DNS configuration complete!"
echo ""
echo "Your MECH services will be available at:"
for service in "${!SERVICES[@]}"; do
    echo "  https://${service}.mech.is"
done
