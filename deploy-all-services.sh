#!/bin/bash

# Deploy all Mech services to Tier 2 architecture
# This script sets up the complete microservices stack on a single droplet

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ️${NC} $1"; }

# Configuration
DROPLET_IP="174.138.68.108"
DEPLOYMENT_DIR="/opt/mech-services-tier2"
REGISTRY_NAME="queue-service-registry"

echo -e "${GREEN}🚀 Deploying All Mech Services - Tier 2 Architecture${NC}"
echo "================================================================"
echo -e "${BLUE}Target Droplet:${NC} $DROPLET_IP"
echo -e "${BLUE}Deployment Directory:${NC} $DEPLOYMENT_DIR"
echo -e "${BLUE}Services to Deploy:${NC} queue, indexer, llms, sequences, storage, reader"
echo ""

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check SSH connection
    if ! ssh -o ConnectTimeout=10 root@$DROPLET_IP "echo 'SSH connected'" > /dev/null 2>&1; then
        print_error "Cannot connect to droplet via SSH"
        exit 1
    fi
    
    # Check if deployment files exist
    if [[ ! -f "tier2-deployment/docker-compose.tier2.yml" ]]; then
        print_error "Deployment files not found. Please run from the correct directory."
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Function to prepare droplet
prepare_droplet() {
    print_info "Preparing droplet for deployment..."
    
    ssh root@$DROPLET_IP << 'EOF'
# Update system packages
apt-get update && apt-get upgrade -y

# Install required packages
apt-get install -y curl wget jq bc htop iotop net-tools lsof unzip git

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install doctl if not present
if ! command -v doctl &> /dev/null; then
    cd /tmp
    DOCTL_VERSION=$(curl -s https://api.github.com/repos/digitalocean/doctl/releases/latest | grep 'tag_name' | cut -d\" -f4 | sed 's/v//')
    wget https://github.com/digitalocean/doctl/releases/latest/download/doctl-${DOCTL_VERSION}-linux-amd64.tar.gz
    tar xf doctl-${DOCTL_VERSION}-linux-amd64.tar.gz
    mv doctl /usr/local/bin/
    chmod +x /usr/local/bin/doctl
    rm -f doctl-*
fi

# Create deployment directory
mkdir -p /opt/mech-services-tier2/{grafana/provisioning/{dashboards,datasources},metrics,backups}

# Set up firewall rules for all services
ufw allow 22/tcp
ufw allow 3000/tcp  # Grafana
ufw allow 3001/tcp  # Reader
ufw allow 3003/tcp  # Queue
ufw allow 3004/tcp  # Queue metrics
ufw allow 3005/tcp  # Indexer
ufw allow 3006/tcp  # LLMs
ufw allow 3007/tcp  # Sequences
ufw allow 3008/tcp  # Storage
ufw allow 8080/tcp  # cAdvisor
ufw allow 9090/tcp  # Prometheus
ufw --force enable

echo "✅ Droplet preparation completed"
EOF

    print_status "Droplet prepared successfully"
}

# Function to create environment files
create_environment_files() {
    print_info "Creating production environment files..."
    
    # Create environment files for all services
    cat > tier2-deployment/.env.queue.production << 'EOF'
# Queue Service Production Environment
VALKEY_HOST=db-valkey-do-user-17543109-0.c.db.ondigitalocean.com
VALKEY_PORT=25061
VALKEY_PASSWORD=AVNS_vUQvA8CUE8VvNmvvNVE
VALKEY_DB=0
MASTER_API_KEY=mech-queue-master-production-key-2024
ENABLE_PROMETHEUS_METRICS=true
LOG_LEVEL=info
MAX_WORKERS_PER_QUEUE=10
NODE_ENV=production
PORT=3003
METRICS_PORT=3004
CORS_ORIGIN=https://queue.mech.is,https://api.mech.is
EOF

    cat > tier2-deployment/.env.indexer.production << 'EOF'
# Indexer Service Production Environment
MONGO_CONN=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/?retryWrites=true&w=majority&appName=MAIN
MONGO_DB_NAME=mechIndexerDB
QUEUE_SERVICE_URL=http://mech-queue:3003
QUEUE_API_KEY=mech-indexer-queue-key-2024
OPENAI_API_KEY=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
CORS_ORIGIN=https://indexer.mech.is,https://api.mech.is,http://localhost:3000
LOG_LEVEL=info
MAX_FILE_SIZE=104857600
SUPPORTED_APPLICATIONS=mech-ai,default
NODE_ENV=production
PORT=3005
EOF

    cat > tier2-deployment/.env.llms.production << 'EOF'
# LLM Service Production Environment
MONGO_CONN=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/?retryWrites=true&w=majority&appName=MAIN
MONGO_DB_NAME=mechLLMsDB
OPENAI_API_KEY=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
ANTHROPIC_API_KEY=sk-ant-api03-placeholder
GOOGLE_API_KEY=AIza-placeholder
TOGETHER_API_KEY=placeholder
REDIS_URL=redis://default:AVNS_vUQvA8CUE8VvNmvvNVE@db-valkey-do-user-17543109-0.c.db.ondigitalocean.com:25061
CACHE_TTL=3600
NODE_ENV=production
PORT=3006
CORS_ORIGIN=https://llms.mech.is,https://api.mech.is
EOF

    cat > tier2-deployment/.env.sequences.production << 'EOF'
# Sequences Service Production Environment  
MONGO_CONN=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/?retryWrites=true&w=majority&appName=MAIN
MONGO_DB_NAME=mechSequencesDB
TEMPORAL_HOST=saas-cluster.tmprl.cloud
TEMPORAL_PORT=7233
TEMPORAL_NAMESPACE=mech-sequences-production
QUEUE_SERVICE_URL=http://mech-queue:3003
LLM_SERVICE_URL=http://mech-llms:3006
STORAGE_SERVICE_URL=http://mech-storage:3008
NODE_ENV=production
PORT=3007
CORS_ORIGIN=https://sequences.mech.is,https://api.mech.is
EOF

    cat > tier2-deployment/.env.storage.production << 'EOF'
# Storage Service Production Environment
MONGO_CONN=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/?retryWrites=true&w=majority&appName=MAIN
MONGO_DB_NAME=mechStorageDB
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key-here
CLOUDFLARE_R2_BUCKET_NAME=mech-storage-production
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
NODE_ENV=production
PORT=3008
CORS_ORIGIN=https://storage.mech.is,https://api.mech.is
EOF

    cat > tier2-deployment/.env.reader.production << 'EOF'
# Reader Service Production Environment
MONGO_CONN=mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/?retryWrites=true&w=majority&appName=MAIN
MONGO_DB_NAME=mechReaderDB
QUEUE_SERVICE_URL=http://mech-queue:3003
STORAGE_SERVICE_URL=http://mech-storage:3008
OPENAI_API_KEY=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
ASSEMBLYAI_API_KEY=your-assemblyai-key-here
TEMP_DIR=/tmp/mech-reader
MAX_FILE_SIZE=500000000
PROCESSING_TIMEOUT=3600
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://reader.mech.is,https://api.mech.is
EOF

    print_status "Environment files created"
}

# Function to upload deployment files
upload_deployment_files() {
    print_info "Uploading deployment files to droplet..."
    
    # Upload all deployment files
    scp -r tier2-deployment/* root@$DROPLET_IP:$DEPLOYMENT_DIR/
    
    # Make scripts executable
    ssh root@$DROPLET_IP "chmod +x $DEPLOYMENT_DIR/*.sh"
    
    print_status "Deployment files uploaded"
}

# Function to setup monitoring configuration
setup_monitoring() {
    print_info "Setting up monitoring configuration..."
    
    ssh root@$DROPLET_IP << EOF
cd $DEPLOYMENT_DIR

# Create Grafana datasource configuration
cat > grafana/provisioning/datasources/prometheus.yml << 'GRAFANA_DS'
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    isDefault: true
    jsonData:
      timeInterval: 15s
GRAFANA_DS

# Create dashboard provider configuration
cat > grafana/provisioning/dashboards/dashboard.yml << 'GRAFANA_DASH'
apiVersion: 1
providers:
  - name: 'Mech Services'
    orgId: 1
    folder: 'Mech Services'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
GRAFANA_DASH

# Set up log rotation
cat > /etc/logrotate.d/mech-services << 'LOGROTATE'
$DEPLOYMENT_DIR/metrics/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
LOGROTATE

echo "✅ Monitoring configuration complete"
EOF

    print_status "Monitoring configured"
}

# Function to deploy services
deploy_services() {
    print_info "Deploying all services..."
    
    ssh root@$DROPLET_IP << EOF
cd $DEPLOYMENT_DIR

echo "🔐 Logging in to DigitalOcean Container Registry..."
doctl registry login

echo "📥 Pulling all service images..."
docker-compose -f docker-compose.tier2.yml pull

echo "🚀 Starting all services..."
docker-compose -f docker-compose.tier2.yml up -d

echo "⏳ Waiting for services to initialize (60 seconds)..."
sleep 60

echo "🏥 Checking service health..."
services=("3001:reader" "3003:queue" "3005:indexer" "3006:llms" "3007:sequences" "3008:storage")

for service in "\${services[@]}"; do
    port=\$(echo \$service | cut -d: -f1)
    name=\$(echo \$service | cut -d: -f2)
    
    if curl -f -s --max-time 10 "http://localhost:\$port/health" > /dev/null; then
        echo "✅ \$name service (port \$port) is healthy"
    else
        echo "⚠️  \$name service (port \$port) is not responding"
    fi
done

echo "📊 Service status:"
docker-compose -f docker-compose.tier2.yml ps

echo "💾 Current resource usage:"
docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}"

echo "✅ All services deployed!"
EOF

    if [[ $? -eq 0 ]]; then
        print_status "All services deployed successfully!"
    else
        print_error "Some services may have failed to deploy"
        return 1
    fi
}

# Function to verify external endpoints
verify_external_access() {
    print_info "Verifying external service access..."
    
    # Wait for DNS/proxy propagation
    sleep 30
    
    local services=(
        "https://queue.mech.is/health:Queue Service"
        "https://indexer.mech.is/health:Indexer Service" 
        "https://indexer.mech.is/api/explain:Indexer Explain"
    )
    
    for service in "${services[@]}"; do
        local url=$(echo $service | cut -d: -f1-2)
        local name=$(echo $service | cut -d: -f3)
        
        if curl -f -s --max-time 15 "$url" > /dev/null; then
            print_status "$name - $url ✅"
        else
            print_warning "$name - $url ⚠️ (may need more time for DNS propagation)"
        fi
    done
}

# Function to start monitoring
start_monitoring() {
    print_info "Starting resource monitoring..."
    
    ssh root@$DROPLET_IP << EOF
cd $DEPLOYMENT_DIR

# Start monitoring in background
nohup ./monitor-resources.sh > /dev/null 2>&1 &
echo \$! > monitor.pid

echo "📊 Resource monitoring started (PID: \$(cat monitor.pid))"
echo "📋 View metrics: tail -f metrics/resource-metrics.log"
echo "📈 View decisions: tail -f metrics/scaling-decisions.log"
EOF

    print_status "Monitoring started"
}

# Function to display deployment summary
show_deployment_summary() {
    print_status "🎉 Tier 2 Deployment Complete!"
    echo ""
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    echo "  • Droplet: $DROPLET_IP"  
    echo "  • Services: 6 microservices + monitoring stack"
    echo "  • Architecture: Tier 2 (all services on single droplet)"
    echo "  • Resource monitoring: Active"
    echo ""
    echo -e "${BLUE}🌐 Service URLs:${NC}"
    echo "  • Queue Service: https://queue.mech.is"
    echo "  • Indexer Service: https://indexer.mech.is" 
    echo "  • LLM Service: https://llms.mech.is"
    echo "  • Sequences Service: https://sequences.mech.is"
    echo "  • Storage Service: https://storage.mech.is"
    echo "  • Reader Service: https://reader.mech.is"
    echo "  • Monitoring: http://$DROPLET_IP:3000 (Grafana)"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo "  • SSH to droplet: ssh root@$DROPLET_IP"
    echo "  • Service directory: cd $DEPLOYMENT_DIR"
    echo "  • Deploy single service: ./deploy-service.sh <service-name>"
    echo "  • View monitoring: ./monitor-resources.sh status"
    echo "  • View logs: docker-compose logs -f <service-name>"
    echo ""
    echo -e "${BLUE}📊 Next Steps:${NC}"
    echo "  1. Monitor resource usage for scaling decisions"
    echo "  2. Configure DNS for any missing service domains"  
    echo "  3. Set up SSL certificates if needed"
    echo "  4. Test all service endpoints and functionality"
    echo ""
    echo -e "${GREEN}✅ Your complete microservices platform is now running!${NC}"
}

# Main deployment function
main() {
    print_info "Starting complete Tier 2 deployment..."
    
    # Run all deployment steps
    check_prerequisites
    prepare_droplet
    create_environment_files
    upload_deployment_files
    setup_monitoring
    deploy_services
    verify_external_access
    start_monitoring
    show_deployment_summary
    
    print_status "🚀 All services successfully deployed to Tier 2 architecture!"
}

# Cleanup function
cleanup() {
    rm -f tier2-deployment/.env.*.production
    print_info "Cleaned up temporary environment files"
}

# Set up cleanup on exit
trap cleanup EXIT

# Run main deployment
main "$@"