# Mech AI Unified Backend - Deployment Checklist

## Prerequisites

- [ ] Azure CLI installed (`az --version`)
- [ ] Docker installed (`docker --version`)
- [ ] Logged into Azure CLI (`az login`)
- [ ] Git repository up to date (`git pull`)

## Azure Resources Setup

### 1. Create Resource Group (if not exists)
```bash
az group create --name mech-ai-rg --location eastus
```

### 2. Create Container Registry (if not exists)
```bash
az acr create --resource-group mech-ai-rg --name mechairegistry --sku Basic
az acr login --name mechairegistry
```

### 3. Create Container App Environment (if not exists)
```bash
az containerapp env create \
  --name mech-ai-env \
  --resource-group mech-ai-rg \
  --location eastus
```

## Deployment Steps

### 1. Set up Secrets
```bash
cd mech-unified-backend
./scripts/setup-azure-secrets.sh
```

You'll be prompted for:
- **MongoDB URI** (required): Your MongoDB connection string
- **OpenAI API Key** (required): For embeddings generation
- **Together AI API Key** (optional): Alternative AI provider
- **GitHub Token** (optional): For private repository access

### 2. Build and Deploy
```bash
./scripts/deploy-azure.sh
```

This script will:
1. Build Docker image
2. Push to Azure Container Registry
3. Create/update Container App
4. Test the deployment

### 3. Verify Deployment

Check health endpoints:
- Basic health: `https://<app-url>/api/health`
- Detailed health: `https://<app-url>/api/health/detailed`
- DB Analyzer: `https://<app-url>/api/db-analyzer/explain`
- Codebase Indexer: `https://<app-url>/api/codebase-indexer/explain`

## Post-Deployment

### 1. Update Frontend Configuration
Update your frontend `.env` file:
```
NEXT_PUBLIC_UNIFIED_BACKEND_URL=https://<your-app-url>
```

### 2. Test Integration
```bash
# Test DB Analyzer
curl https://<app-url>/api/db-analyzer/overview

# Test Codebase Indexer
curl https://<app-url>/api/codebase-indexer/health
```

### 3. Monitor Logs
```bash
az containerapp logs show \
  --name mech-unified-backend \
  --resource-group mech-ai-rg \
  --follow
```

## Troubleshooting

### Common Issues

1. **Container fails to start**
   - Check logs: `az containerapp logs show --name mech-unified-backend --resource-group mech-ai-rg`
   - Verify secrets are set correctly
   - Ensure MongoDB connection string is valid

2. **Health check fails**
   - Verify MongoDB is accessible from Azure
   - Check if all required environment variables are set
   - Review container logs for startup errors

3. **OpenAI API errors**
   - Verify API key is valid
   - Check OpenAI quota and rate limits
   - Ensure embedding model is available in your OpenAI account

### Rollback Procedure

If deployment fails:
```bash
# View revision history
az containerapp revision list \
  --name mech-unified-backend \
  --resource-group mech-ai-rg

# Activate previous revision
az containerapp revision activate \
  --name mech-unified-backend \
  --resource-group mech-ai-rg \
  --revision <previous-revision-name>
```

## Security Checklist

- [ ] All sensitive data stored as secrets (not in code)
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] HTTPS only (handled by Container Apps)
- [ ] MongoDB connection uses SSL/TLS
- [ ] Container runs as non-root user

## Performance Monitoring

1. **Container App Metrics**
   ```bash
   az monitor metrics list \
     --resource <container-app-resource-id> \
     --metric "Requests" "CpuUsage" "MemoryUsage"
   ```

2. **MongoDB Atlas Monitoring**
   - Check Atlas dashboard for query performance
   - Monitor index usage
   - Review slow query logs

3. **OpenAI Usage**
   - Monitor API usage in OpenAI dashboard
   - Track embedding costs
   - Check rate limit status

## Scaling Configuration

The Container App is configured with:
- Min replicas: 1
- Max replicas: 5
- CPU: 1.0 core
- Memory: 2.0 GB

To adjust scaling:
```bash
az containerapp update \
  --name mech-unified-backend \
  --resource-group mech-ai-rg \
  --min-replicas 2 \
  --max-replicas 10
```

## Backup and Recovery

1. **MongoDB Backup**
   - Use MongoDB Atlas automated backups
   - Configure point-in-time recovery

2. **Container App Configuration**
   ```bash
   # Export configuration
   az containerapp show \
     --name mech-unified-backend \
     --resource-group mech-ai-rg \
     > backup-config.json
   ```

## Notes

- The unified backend includes db-analyzer and codebase-indexer services
- Vector search requires MongoDB Atlas with Search enabled
- Embedding generation uses OpenAI's text-embedding-3-large model
- All operations are scoped by projectId for multi-tenancy