#!/bin/bash

# Script to update indexer with explain endpoints
set -e

echo "Building and deploying indexer service with explain endpoints..."

# Build the indexer locally
echo "Building indexer service..."
cd ../mech-indexer
npm run build

# Build Docker image
echo "Building Docker image..."
docker build --platform linux/amd64 -f Dockerfile.explain -t mech-indexer:explain .

# Save the image
echo "Saving Docker image..."
docker save mech-indexer:explain | gzip > mech-indexer-explain.tar.gz

# Transfer to droplet
echo "Transferring to droplet..."
scp mech-indexer-explain.tar.gz root@174.138.68.108:/tmp/

# Deploy on droplet
echo "Deploying on droplet..."
ssh root@174.138.68.108 << 'EOF'
cd /tmp
docker load < mech-indexer-explain.tar.gz
docker stop indexer-service || true
docker rm indexer-service || true
docker run -d \
  --name indexer-service \
  --restart unless-stopped \
  -p 3005:3005 \
  --env-file /root/indexer.env \
  mech-indexer:explain
docker ps
rm mech-indexer-explain.tar.gz
EOF

# Clean up local file
rm mech-indexer-explain.tar.gz

echo "Indexer service updated with explain endpoints!"
echo "Testing explain endpoint..."
sleep 5
curl -s https://indexer.mech.is/api/explain | jq .