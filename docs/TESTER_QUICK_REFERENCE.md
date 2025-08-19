# Tester Quick Reference Card

## 🔑 Test Credentials Location

**ALL test credentials are in the `.env` file:**

```bash
TESTER_EMAIL=<test user email>
TESTER_PASSWORD=<test user password>
```

## 🚀 Quick Start

1. **Check credentials exist:**
   ```bash
   grep TESTER_ .env
   ```

2. **Login to test:**
   ```
   Email: [value from TESTER_EMAIL]
   Password: [value from TESTER_PASSWORD]
   ```

3. **Access test environment:**
   - Main app: http://localhost:3000
   - Test tools: http://localhost:3000/test-tools

## 📝 Using Credentials in Tests

### Manual Testing
1. Open browser to http://localhost:3000
2. Use TESTER_EMAIL and TESTER_PASSWORD to login
3. Select test project (usually "Mech AI")

### Automated Testing
```javascript
// Load credentials
require('dotenv').config();
const email = process.env.TESTER_EMAIL;
const password = process.env.TESTER_PASSWORD;

// Use in Playwright
await page.fill('#email', email);
await page.fill('#password', password);
```

### API Testing
```javascript
// First login to get session cookie
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: process.env.TESTER_EMAIL,
    password: process.env.TESTER_PASSWORD
  })
});
```

## ⚠️ Security Reminders

1. **NEVER** hardcode credentials in test files
2. **NEVER** commit `.env` to version control
3. **ALWAYS** use environment variables
4. **ALWAYS** mask passwords in logs/screenshots

## 🔍 Troubleshooting

### Can't find credentials?
```bash
# Check if .env exists
ls -la .env

# Check if variables are set
echo $TESTER_EMAIL
```

### Login failing?
1. Verify credentials are correct in `.env`
2. Check if test user exists in database
3. Ensure server is running (`npm run dev`)
4. Check for typos or extra spaces

### Need different test user?
Contact the team lead to get additional test credentials added to `.env`

## 📋 Standard Test Users

| User Type | Email Variable | Purpose |
|-----------|---------------|---------|
| Basic Tester | TESTER_EMAIL | General testing |
| Admin Tester | ADMIN_TESTER_EMAIL | Admin features |
| Limited Tester | LIMITED_TESTER_EMAIL | Permission testing |

*Note: Not all user types may be configured. Check `.env` for available credentials.*

---

**Remember**: When in doubt, check the `.env` file!