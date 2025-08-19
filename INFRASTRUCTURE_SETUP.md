# Mech Platform - Infrastructure Setup Guide

## Overview

This guide covers the complete infrastructure setup for the Mech platform, focusing on the critical components that must be configured correctly for successful deployments. Based on our deployment experience, this addresses the most common failure points.

## 🚨 Critical Infrastructure Components

### 1. UFW Firewall Configuration (MOST IMPORTANT)

The UFW firewall is the #1 cause of deployment failures. Services may appear to deploy successfully but remain inaccessible due to blocked ports.

#### Essential Firewall Rules
```bash
# SSH access (NEVER block this)
sudo ufw allow 22/tcp

# Web traffic (CRITICAL for public access)
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Mech service ports (ALL SERVICES)
sudo ufw allow 3001/tcp  # mech-reader
sudo ufw allow 3002/tcp  # mech-queue
sudo ufw allow 3004/tcp  # mech-sequences
sudo ufw allow 3005/tcp  # mech-indexer
sudo ufw allow 3007/tcp  # mech-storage
sudo ufw allow 3008/tcp  # mech-llms
sudo ufw allow 3009/tcp  # mech-search
sudo ufw allow 3010/tcp  # mech-memories

# Additional services
sudo ufw allow 8888/tcp  # Additional services/monitoring

# Enable firewall
sudo ufw --force enable

# Verify configuration
sudo ufw status numbered
```

#### Firewall Verification Commands
```bash
# Check status
sudo ufw status verbose

# Test specific port
nc -zv localhost 3008

# Check what's listening on ports
ss -tlnp | grep -E "(3001|3002|3004|3005|3007|3008|3009|3010)"
```

### 2. Docker Infrastructure

#### Docker Installation
```bash
# Remove old Docker versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

#### Docker Network Setup (CRITICAL)
```bash
# Create mech-network (REQUIRED for service communication)
docker network create mech-network

# Verify network
docker network ls | grep mech-network
docker network inspect mech-network

# For existing containers, connect to network
docker network connect mech-network container-name
```

#### Docker Hub Authentication
```bash
# Login to Docker Hub (for image pulls)
docker login

# Or use environment variables
export DOCKER_USERNAME="your-username"
export DOCKER_PASSWORD="your-password"
echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin
```

### 3. Nginx Configuration

#### Nginx Installation
```bash
# Install nginx
sudo apt update
sudo apt install nginx -y

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
nginx -v
sudo systemctl status nginx
```

#### Default Configuration Cleanup
```bash
# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Create mech-specific configuration directory
sudo mkdir -p /etc/nginx/conf.d/mech
```

#### Standard Service Configuration Template
```nginx
# Template: /etc/nginx/sites-available/SERVICE.mech.is
server {
    listen 80;
    server_name SERVICE.mech.is;
    
    # Cloudflare real IP configuration
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;
    
    # Main proxy configuration
    location / {
        proxy_pass http://localhost:PORT;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout configuration
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer configuration
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Health check endpoint (bypass proxy for local checks)
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

#### Automated Service Configuration Script
```bash
#!/bin/bash
# create-nginx-config.sh

SERVICE_NAME=$1
SERVICE_PORT=$2

if [[ -z "$SERVICE_NAME" || -z "$SERVICE_PORT" ]]; then
    echo "Usage: $0 <service-name> <port>"
    echo "Example: $0 llm 3008"
    exit 1
fi

# Create nginx configuration
cat > /etc/nginx/sites-available/${SERVICE_NAME}.mech.is << EOF
server {
    listen 80;
    server_name ${SERVICE_NAME}.mech.is;
    
    # Cloudflare real IP
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    real_ip_header CF-Connecting-IP;
    
    location / {
        proxy_pass http://localhost:${SERVICE_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/${SERVICE_NAME}.mech.is /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx

echo "✅ Nginx configuration created for ${SERVICE_NAME}.mech.is"
```

### 4. Directory Structure

#### Standard Directory Layout
```bash
# Create base directory structure
sudo mkdir -p /opt/mech-services
cd /opt/mech-services

# Service directories
for service in queue llms storage indexer sequences search reader memories; do
    sudo mkdir -p mech-$service
    sudo mkdir -p mech-$service/data
    sudo mkdir -p mech-$service/logs
    sudo mkdir -p mech-$service/backups
done

# Shared directories
sudo mkdir -p shared/nginx
sudo mkdir -p shared/ssl
sudo mkdir -p shared/scripts
sudo mkdir -p shared/monitoring

# Set permissions
sudo chown -R root:root /opt/mech-services
sudo chmod -R 755 /opt/mech-services
```

#### Service Configuration Templates
```bash
# Create environment template
cat > /opt/mech-services/env-template << 'EOF'
# Common environment variables
NODE_ENV=production
LOG_LEVEL=info

# Database connections (use container names)
MONGODB_URI=mongodb://mongodb:27017/mech
REDIS_HOST=redis
REDIS_PORT=6379

# Service-specific port
PORT=SERVICE_PORT

# Add service-specific variables below
EOF
```

### 5. SSL Certificate Management

#### Self-Signed Certificates (for Cloudflare Flexible Mode)
```bash
# Generate self-signed certificate for nginx
sudo mkdir -p /etc/ssl/mech
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/mech/mech.key \
    -out /etc/ssl/mech/mech.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=*.mech.is"

# Set permissions
sudo chmod 600 /etc/ssl/mech/mech.key
sudo chmod 644 /etc/ssl/mech/mech.crt
```

#### Let's Encrypt Certificates (Alternative)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate (requires DNS to be configured first)
sudo certbot --nginx -d service.mech.is --non-interactive --agree-tos --email admin@mech.is

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Monitoring Infrastructure

#### System Monitoring Setup
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs ncdu -y

# Create monitoring script
cat > /opt/mech-services/shared/scripts/monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Resources ==="
free -h
df -h
echo ""

echo "=== Docker Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "=== Service Health ==="
for service in queue llm storage indexer sequences search reader memories; do
    status=$(curl -s --max-time 3 http://localhost:$(docker port mech-$service | cut -d: -f2)/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "failed")
    echo "$service: $status"
done
EOF

chmod +x /opt/mech-services/shared/scripts/monitor.sh
```

#### Log Management
```bash
# Configure log rotation for Docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker
sudo systemctl restart docker
```

### 7. Security Configuration

#### Basic Security Hardening
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban

# Configure SSH security
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Set up automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

#### Docker Security
```bash
# Create docker group and add user
sudo groupadd docker
sudo usermod -aG docker $USER

# Configure Docker daemon security
echo '{
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true
}' | sudo tee -a /etc/docker/daemon.json
```

### 8. Database Infrastructure

#### MongoDB Setup (if needed)
```bash
# Run MongoDB container
docker run -d \
    --name mongodb \
    --network mech-network \
    -v /opt/mech-services/shared/data/mongodb:/data/db \
    -p 27017:27017 \
    --restart unless-stopped \
    mongo:latest
```

#### Redis Setup (if needed)
```bash
# Run Redis container
docker run -d \
    --name redis \
    --network mech-network \
    -v /opt/mech-services/shared/data/redis:/data \
    -p 6379:6379 \
    --restart unless-stopped \
    redis:alpine
```

## Infrastructure Validation

### Verification Checklist
```bash
# 1. UFW Firewall
sudo ufw status | grep -E "(80|443|3001|3002|3004|3005|3007|3008|3009|3010)"

# 2. Docker Network
docker network ls | grep mech-network

# 3. Nginx Configuration
nginx -t

# 4. Directory Structure
ls -la /opt/mech-services/

# 5. SSL Certificates
ls -la /etc/ssl/mech/

# 6. Service Ports
ss -tlnp | grep -E "(3001|3002|3004|3005|3007|3008|3009|3010)"
```

### Testing Infrastructure
```bash
# Test nginx proxy (replace PORT with actual service port)
curl -H "Host: service.mech.is" http://localhost/health

# Test Docker networking
docker run --rm --network mech-network alpine:latest ping -c 1 mech-network

# Test firewall rules
nc -zv localhost 3008
```

## Common Infrastructure Issues

### Issue 1: UFW Blocking Traffic
**Symptoms**: 522/524 errors, services unreachable
**Solution**: 
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### Issue 2: Docker Network Issues
**Symptoms**: Services can't communicate
**Solution**:
```bash
docker network create mech-network
docker network connect mech-network container-name
```

### Issue 3: Nginx Configuration Errors
**Symptoms**: Bad Gateway errors
**Solution**:
```bash
nginx -t  # Check configuration
sudo systemctl reload nginx
```

### Issue 4: Port Conflicts
**Symptoms**: Container fails to start
**Solution**:
```bash
ss -tlnp | grep PORT  # Check what's using the port
sudo lsof -i :PORT   # Alternative check
```

## Maintenance Procedures

### Regular Maintenance Tasks
```bash
# Weekly system updates
sudo apt update && sudo apt upgrade -y

# Monthly Docker cleanup
docker system prune -f

# Check disk usage
df -h
docker system df

# Review logs
journalctl -u nginx --since "1 week ago"
```

### Backup Procedures
```bash
# Backup nginx configurations
tar -czf nginx-backup-$(date +%Y%m%d).tar.gz /etc/nginx/

# Backup environment files
tar -czf env-backup-$(date +%Y%m%d).tar.gz /opt/mech-services/*/env

# Backup SSL certificates
tar -czf ssl-backup-$(date +%Y%m%d).tar.gz /etc/ssl/mech/
```

## Infrastructure Automation

### Setup Script
```bash
#!/bin/bash
# infrastructure-setup.sh

set -e

echo "Setting up Mech platform infrastructure..."

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install nginx
apt install nginx -y

# Configure UFW
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001:3010/tcp
ufw allow 8888/tcp
ufw --force enable

# Create Docker network
docker network create mech-network

# Create directory structure
mkdir -p /opt/mech-services/shared/{nginx,ssl,scripts,monitoring}
for service in queue llms storage indexer sequences search reader memories; do
    mkdir -p /opt/mech-services/mech-$service/{data,logs,backups}
done

# Generate SSL certificate
mkdir -p /etc/ssl/mech
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/mech/mech.key \
    -out /etc/ssl/mech/mech.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=*.mech.is"

echo "✅ Infrastructure setup complete!"
echo "Next: Configure individual services and deploy containers"
```

This infrastructure setup guide provides the foundation for reliable Mech platform deployments. Follow these configurations to avoid the most common deployment issues.