# Credential Rotation Guide

## 🚨 URGENT: Exposed Credentials to Rotate

### 1. MongoDB Atlas
**Exposed**: `[REDACTED - ROTATE IMMEDIATELY]`

**Steps to rotate**:
1. Login to [MongoDB Atlas](https://cloud.mongodb.com)
2. Go to Database Access
3. Delete compromised user
4. Create new user with strong password
5. Update connection string format:
   ```
   mongodb+srv://NEW_USER:NEW_PASSWORD@cluster.mongodb.net/
   ```

### 2. OpenAI API Key
**Exposed**: `[REDACTED - ROTATE IMMEDIATELY]`

**Steps to rotate**:
1. Login to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Revoke the exposed key immediately
3. Create new API key
4. Set usage limits on new key
5. Monitor for any unauthorized usage

### 3. Vultr API Key
**Exposed**: `[REDACTED - ROTATE IMMEDIATELY]`

**Steps to rotate**:
1. Login to [Vultr Dashboard](https://my.vultr.com/)
2. Go to Account → API
3. Regenerate API key
4. Update IP whitelist to only allow your IPs
5. Check for any unauthorized instances created

### 4. Cloudflare R2 Credentials
**Exposed**: `[REDACTED - ROTATE IMMEDIATELY]`

**Steps to rotate**:
1. Login to Cloudflare Dashboard
2. Go to R2 → Manage R2 API tokens
3. Delete the exposed token
4. Create new API token with minimum required permissions
5. Update bucket policies if needed

### 5. Docker Hub Access Token
**Exposed**: `[REDACTED - ROTATE IMMEDIATELY]`

**Steps to rotate**:
1. Login to [Docker Hub](https://hub.docker.com/)
2. Go to Account Settings → Security
3. Delete the exposed access token
4. Create new access token
5. Update any CI/CD pipelines

### 6. Redis Password
**Exposed**: `AVeVAAIjcDE4MzdjMmQ1N2U1MDM0YmEzYTVkZDk5YTgyZDJmM2RlNnAxMA`

**Steps to rotate**:
1. Access your Redis/Valkey instance
2. Update the password
3. Update all service configurations

## Setting Up New Credentials

### 1. Create Master .env File
```bash
# Create secure .env file
touch .env
chmod 600 .env
```

### 2. Add New Credentials
```bash
# Edit .env file with new credentials
cat > .env << 'EOF'
# MongoDB
MONGODB_URI=mongodb+srv://NEW_USER:NEW_PASS@main.h81m1fq.mongodb.net/

# API Keys
OPENAI_API_KEY=sk-new-key-here
VULTR_API_KEY=new-vultr-key-here
ANTHROPIC_API_KEY=sk-ant-new-key-here

# Cloudflare R2
R2_ACCESS_KEY_ID=new-access-key
R2_SECRET_ACCESS_KEY=new-secret-key
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com

# Docker Hub
DOCKER_HUB_USERNAME=your-username
DOCKER_HUB_PASSWORD=new-token-here

# Redis
REDIS_URL=redis://default:new-password@host:port
EOF
```

### 3. Update Service-Specific Env Files
```bash
# Copy to service-specific files
for service in mech-reader mech-indexer mech-storage mech-llms mech-queue; do
  cp .env .env.$service.production
done
```

### 4. Test New Credentials
```bash
# Load and test
source scripts/load-env.sh

# Test MongoDB
node -e "
const { MongoClient } = require('mongodb');
MongoClient.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connection successful'))
  .catch(err => console.error('❌ MongoDB error:', err.message));
"

# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  | jq '.error // "✅ OpenAI API key valid"'
```

## Security Checklist

- [ ] All exposed credentials rotated
- [ ] New credentials stored in .env file only
- [ ] .env file permissions set to 600
- [ ] All hardcoded credentials removed from code
- [ ] Git history cleaned (if public repo)
- [ ] Access logs reviewed for unauthorized usage
- [ ] IP whitelisting enabled where possible
- [ ] Rate limiting configured on APIs
- [ ] Monitoring alerts set up
- [ ] Team notified of credential rotation

## Monitoring for Unauthorized Usage

### MongoDB Atlas
- Check Atlas Activity Feed for unusual connections
- Review database access logs

### OpenAI
- Check usage dashboard for unexpected API calls
- Review billing for unusual charges

### Vultr
- Check for unauthorized instances
- Review API access logs

### Docker Hub
- Check for unauthorized image pulls
- Review access logs

## Preventing Future Exposures

1. **Use Git Hooks**:
```bash
# Install pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Check for credentials
if git diff --cached --name-only | xargs grep -E "(mongodb\+srv://|sk-[a-zA-Z0-9]{48}|HJBCBJOMJTWIDW4BAYJ5BKIKSKNJ4OR2VNYA)"; then
  echo "❌ Possible credential detected! Please remove before committing."
  exit 1
fi
EOF
chmod +x .git/hooks/pre-commit
```

2. **Use Secret Scanning Tools**:
```bash
# Install and run trufflehog
brew install trufflehog
trufflehog filesystem . --json
```

3. **Regular Audits**:
```bash
# Run credential scan weekly
./scripts/remove-hardcoded-credentials.sh
```

## Emergency Contact

If you discover unauthorized usage:
1. Immediately rotate affected credentials
2. Document the incident
3. Review access logs
4. Consider enabling 2FA where available
5. Report to relevant service providers

Remember: **Never commit credentials to version control!**