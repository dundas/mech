#!/bin/bash

# Deploy Mech AI Unified Backend to Azure Container Apps
# This script builds and deploys the unified backend to Azure

set -e

echo "🚀 Deploying Mech AI Unified Backend to Azure Container Apps..."

# Configuration
RESOURCE_GROUP="mech-ai-rg"
CONTAINER_APP_NAME="mech-unified-backend"
CONTAINER_REGISTRY="mechairegistry"
IMAGE_NAME="mech-unified-backend"
LOCATION="eastus"
ENVIRONMENT_NAME="mech-ai-env"

# Build Docker image
echo "📦 Building Docker image..."
docker build -t $IMAGE_NAME:latest .

# Tag for Azure Container Registry
echo "🏷️  Tagging image for Azure Container Registry..."
docker tag $IMAGE_NAME:latest $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:latest

# Push to Azure Container Registry
echo "⬆️  Pushing image to Azure Container Registry..."
docker push $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:latest

# Create Azure Container App
echo "🌐 Creating Azure Container App..."
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:latest \
  --target-port 3001 \
  --ingress external \
  --registry-server $CONTAINER_REGISTRY.azurecr.io \
  --cpu 1.0 \
  --memory 2.0Gi \
  --min-replicas 1 \
  --max-replicas 5 \
  --env-vars \
    NODE_ENV=production \
    PORT=3001 \
    MONGODB_URI=secretref:mongodb-uri \
    MONGODB_DATABASE=mechDB \
    OPENAI_API_KEY=secretref:openai-api-key \
    EMBEDDING_MODEL=text-embedding-3-large \
    EMBEDDING_DIMENSIONS=3072 \
    CORS_ORIGINS=https://mech-ai.azurewebsites.net \
    CORS_CREDENTIALS=true \
    RATE_LIMIT_WINDOW_MS=60000 \
    RATE_LIMIT_MAX_REQUESTS=100 \
    LOG_LEVEL=info \
    ENABLE_REASONING_EMBEDDINGS=true \
    ENABLE_REAL_TIME_UPDATES=true \
    ENABLE_SESSION_CHECKPOINTS=true \
    TOGETHER_API_KEY=secretref:together-api-key \
    GITHUB_TOKEN=secretref:github-token

# Get the app URL
APP_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv)

echo "✅ Deployment completed successfully!"
echo "🌐 App URL: https://$APP_URL"
echo "🔗 Health check: https://$APP_URL/api/health"
echo "📊 Detailed health: https://$APP_URL/api/health/detailed"

# Test the deployment
echo "🧪 Testing deployment..."
sleep 10
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$APP_URL/api/health")

if [ $HTTP_STATUS -eq 200 ]; then
  echo "✅ Deployment test passed!"
else
  echo "❌ Deployment test failed. HTTP Status: $HTTP_STATUS"
  exit 1
fi

echo "🎉 Mech AI Unified Backend deployed successfully to Azure!"
echo "📝 Next steps:"
echo "1. Update frontend .env.claude with new backend URL: https://$APP_URL"
echo "2. Test the hook integration"
echo "3. Monitor logs: az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP"