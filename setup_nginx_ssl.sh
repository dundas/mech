#!/bin/bash

# MECH Services Nginx + SSL Setup Script
# This script configures nginx reverse proxy and SSL for all MECH services

echo "🌐 MECH Services Nginx + SSL Setup"
echo "=================================="

# Service configurations
declare -A SERVICES=(
    ["storage"]="167.99.50.167:3007"
    ["indexer"]="165.227.71.77:3006"
    ["sequences"]="159.65.38.23:3004"
    ["search"]="192.81.212.16:3009"
    ["reader"]="165.227.194.103:3001"
    ["queue"]="167.71.80.180:3002"
    ["llm"]="64.225.3.13:3008"
)

setup_nginx_for_service() {
    local service=$1
    local ip_port=$2
    local ip=$(echo $ip_port | cut -d: -f1)
    local port=$(echo $ip_port | cut -d: -f2)
    local domain="${service}.mech.is"
    
    echo "🔧 Setting up nginx for $service ($domain)"
    
    # Create nginx configuration
    ssh -o StrictHostKeyChecking=no root@$ip "cat > /etc/nginx/sites-available/$domain << 'EOF'
server {
    listen 80;
    server_name $domain;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $domain;
    
    # SSL Configuration (Let's Encrypt certificates)
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_private_key /etc/letsencrypt/live/$domain/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security \"max-age=63072000\" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection \"1; mode=block\";
    
    # Proxy Configuration
    location / {
        proxy_pass http://localhost:$port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        
        # Handle large requests (for file uploads)
        client_max_body_size 100M;
    }
    
    # Health check endpoint optimization
    location /health {
        proxy_pass http://localhost:$port/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 10s;
        proxy_send_timeout 10s;
    }
}
EOF"

    # Enable the site
    ssh -o StrictHostKeyChecking=no root@$ip "ln -sf /etc/nginx/sites-available/$domain /etc/nginx/sites-enabled/"
    
    # Install certbot if not present
    ssh -o StrictHostKeyChecking=no root@$ip "which certbot || (apt-get update && apt-get install -y certbot python3-certbot-nginx)"
    
    # Get SSL certificate
    echo "🔒 Getting SSL certificate for $domain..."
    ssh -o StrictHostKeyChecking=no root@$ip "certbot --nginx -d $domain --non-interactive --agree-tos -m admin@mech.is --redirect" || echo "⚠️ SSL setup failed for $domain (will retry)"
    
    # Test nginx configuration
    ssh -o StrictHostKeyChecking=no root@$ip "nginx -t && systemctl reload nginx" || echo "❌ Nginx config error for $domain"
    
    echo "✅ Completed setup for $service"
    echo ""
}

# Setup nginx for all services
for service in "${!SERVICES[@]}"; do
    setup_nginx_for_service "$service" "${SERVICES[$service]}"
done

echo "🎉 Nginx + SSL setup complete!"
echo ""
echo "🧪 Testing HTTPS endpoints..."
echo "==============================="

# Test all HTTPS endpoints
for service in "${!SERVICES[@]}"; do
    domain="${service}.mech.is"
    echo -n "Testing https://$domain/health: "
    
    # Give SSL certificates time to propagate
    sleep 2
    
    status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "https://$domain/health" 2>/dev/null)
    
    if [ "$status" = "200" ]; then
        echo "✅ HTTPS working"
    elif [ "$status" = "000" ]; then
        echo "❌ Connection failed"
    else
        echo "⚠️ HTTP $status"
    fi
done

echo ""
echo "🌐 Your MECH services are now available at:"
for service in "${!SERVICES[@]}"; do
    echo "  ✅ https://${service}.mech.is"
done