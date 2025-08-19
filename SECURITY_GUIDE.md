# Security Guide for Mech Services

## 🚨 IMMEDIATE ACTIONS REQUIRED

### 1. Rotate All Exposed Credentials

The following credentials have been exposed and MUST be rotated immediately:

- **MongoDB**: Login to MongoDB Atlas and generate new credentials
- **OpenAI**: Go to platform.openai.com and create new API keys
- **Anthropic**: Visit console.anthropic.com to rotate keys
- **Vultr**: Access Vultr dashboard to generate new API key

### 2. Remove Hardcoded Credentials

Run the security scan:
```bash
./scripts/remove-hardcoded-credentials.sh
```

### 3. Set Up Environment Variables

```bash
# Copy the template
cp .env.example .env

# Edit with your actual credentials
nano .env

# Set permissions
chmod 600 .env
```

## Best Practices

### Never Hardcode Credentials

❌ **BAD**:
```javascript
const MONGODB_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/db';
```

✅ **GOOD**:
```javascript
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable not set');
}
```

### Use Environment-Specific Files

```
.env                    # Local development
.env.test              # Test environment
.env.production        # Production (never commit!)
.env.example           # Template (safe to commit)
```

### Secure Deployment

1. **Use Secret Management**:
   - Vultr: Use Vultr Secrets
   - AWS: Use AWS Secrets Manager
   - Docker: Use Docker secrets
   - Kubernetes: Use K8s secrets

2. **CI/CD Security**:
   ```yaml
   # GitHub Actions example
   env:
     MONGODB_URI: ${{ secrets.MONGODB_URI }}
     OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

3. **Runtime Injection**:
   ```bash
   # Docker run with env file
   docker run --env-file .env.production service-name
   
   # Docker compose
   env_file:
     - .env.production
   ```

### Access Control

1. **API Key Requirements**:
   - All services should require API keys
   - Use unique keys per service
   - Implement rate limiting
   - Log API key usage

2. **Network Security**:
   - Use private networks for inter-service communication
   - Enable firewalls
   - Use HTTPS/TLS for all external communication

### Monitoring

1. **Audit Logs**:
   - Log all credential usage
   - Monitor for suspicious access patterns
   - Set up alerts for failed authentication

2. **Regular Rotation**:
   - Rotate credentials every 90 days
   - Use automated rotation where possible
   - Keep audit trail of rotations

## Credential Storage Patterns

### Local Development
```bash
# Use direnv or similar
echo "export MONGODB_URI=your-uri" >> .envrc
direnv allow
```

### Production Deployment

#### Option 1: Environment Variables
```bash
# Set on server
export MONGODB_URI="your-production-uri"
export OPENAI_API_KEY="your-production-key"
```

#### Option 2: Docker Secrets
```bash
# Create secret
echo "your-mongodb-uri" | docker secret create mongodb_uri -

# Use in service
docker service create \
  --secret mongodb_uri \
  --env MONGODB_URI_FILE=/run/secrets/mongodb_uri \
  service-name
```

#### Option 3: Cloud Provider Secrets
```bash
# Vultr example
vultr-cli secrets create \
  --name mongodb-uri \
  --value "your-connection-string"
```

## Security Checklist

- [ ] All hardcoded credentials removed
- [ ] .env files added to .gitignore
- [ ] Environment variables documented in .env.example
- [ ] Production credentials stored securely
- [ ] All exposed credentials rotated
- [ ] API key authentication implemented
- [ ] HTTPS enabled for all services
- [ ] Firewall rules configured
- [ ] Access logs enabled
- [ ] Regular credential rotation scheduled

## Emergency Response

If credentials are exposed:

1. **Immediately rotate** the exposed credentials
2. **Check logs** for unauthorized access
3. **Update all services** with new credentials
4. **Review git history** and remove if necessary:
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/file' \
     --prune-empty --tag-name-filter cat -- --all
   ```
5. **Force push** to update remote repository
6. **Notify team** about the security incident

## Tools and Resources

- **Git-secrets**: https://github.com/awslabs/git-secrets
- **TruffleHog**: https://github.com/trufflesecurity/trufflehog
- **Vault**: https://www.vaultproject.io/
- **SOPS**: https://github.com/mozilla/sops

Remember: Security is everyone's responsibility. When in doubt, ask for help!