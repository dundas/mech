#!/bin/bash

# Setup Azure Container App Secrets for Mech AI Unified Backend
# This script helps you securely set up secrets without hardcoding them

set -e

echo "🔐 Setting up Azure Container App Secrets for Mech AI Unified Backend"
echo "⚠️  This script will prompt you for sensitive values. They will not be stored in any files."

# Configuration
RESOURCE_GROUP="mech-ai-rg"
CONTAINER_APP_NAME="mech-unified-backend"

# Function to safely read secrets
read_secret() {
    local secret_name=$1
    local prompt_text=$2
    local secret_value
    
    echo -n "$prompt_text"
    read -s secret_value
    echo
    
    if [ -z "$secret_value" ]; then
        echo "❌ Error: $secret_name cannot be empty"
        exit 1
    fi
    
    echo "$secret_value"
}

echo "📝 Please provide the following secret values:"
echo

# Read secrets securely
MONGODB_URI=$(read_secret "MONGODB_URI" "Enter MongoDB URI (mongodb+srv://...): ")
OPENAI_API_KEY=$(read_secret "OPENAI_API_KEY" "Enter OpenAI API Key (sk-...): ")
TOGETHER_API_KEY=$(read_secret "TOGETHER_API_KEY" "Enter Together AI API Key (optional, press Enter to skip): ")
GITHUB_TOKEN=$(read_secret "GITHUB_TOKEN" "Enter GitHub Token (optional, for private repos, press Enter to skip): ")

echo
echo "🔄 Setting secrets in Azure Container App..."

# Set required secrets
az containerapp secret set \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --secrets \
        mongodb-uri="$MONGODB_URI" \
        openai-api-key="$OPENAI_API_KEY"

# Set optional secrets if provided
if [ ! -z "$TOGETHER_API_KEY" ]; then
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets together-api-key="$TOGETHER_API_KEY"
fi

if [ ! -z "$GITHUB_TOKEN" ]; then
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets github-token="$GITHUB_TOKEN"
fi

echo
echo "✅ Secrets have been securely set in Azure Container App!"
echo "🔒 The secrets are now stored in Azure and referenced by the container app."
echo "📝 You can update these secrets anytime by running this script again."
echo
echo "🚀 Next step: Run ./scripts/deploy-azure.sh to deploy the application"