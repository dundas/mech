# MECH Services DNS Mapping Analysis

## 🔍 **DNS Resolution Results**

| Service | Expected IP | Actual DNS Resolution | Status | Notes |
|---------|-------------|----------------------|--------|-------|
| **storage.mech.is** | `167.99.50.167` | `174.138.68.108` | ⚠️ **MISMATCH** | Points to wrong IP |
| **indexer.mech.is** | `165.227.71.77` | `174.138.68.108` | ⚠️ **MISMATCH** | Points to wrong IP |
| **sequences.mech.is** | `159.65.38.23` | `159.65.38.23` | ✅ **CORRECT** | Perfect match |
| **search.mech.is** | `192.81.212.16` | `159.65.38.23` | ⚠️ **MISMATCH** | Points to sequences IP |
| **reader.mech.is** | `165.227.194.103` | `165.227.194.103` | ✅ **CORRECT** | Perfect match |
| **queue.mech.is** | `167.71.80.180` | `174.138.68.108` | ⚠️ **MISMATCH** | Points to wrong IP |
| **llm.mech.is** | `64.225.3.13` | `68.183.102.57` | ⚠️ **MISMATCH** | Points to wrong IP |

## 🚨 **Critical DNS Issues Found**

### **Problem: Multiple services pointing to wrong IPs**

1. **`174.138.68.108`** - Unknown server hosting:
   - storage.mech.is ❌
   - indexer.mech.is ❌ 
   - queue.mech.is ❌

2. **`68.183.102.57`** - Unknown server hosting:
   - llm.mech.is ❌

3. **`159.65.38.23`** - Correct sequences server but also hosting:
   - search.mech.is ❌ (should be on 192.81.212.16)

### **Health Check Results**

- **storage.mech.is**: Connection failed ❌
- **sequences.mech.is**: Connection failed ❌  
- **reader.mech.is**: 504 Gateway Timeout (nginx error) ⚠️

## 🛠️ **Required DNS Fixes**

### **Immediate Actions Needed:**

1. **Update storage.mech.is**
   - FROM: `174.138.68.108`
   - TO: `167.99.50.167`

2. **Update indexer.mech.is** 
   - FROM: `174.138.68.108`
   - TO: `165.227.71.77`

3. **Update search.mech.is**
   - FROM: `159.65.38.23` 
   - TO: `192.81.212.16`

4. **Update queue.mech.is**
   - FROM: `174.138.68.108`
   - TO: `167.71.80.180`

5. **Update llm.mech.is**
   - FROM: `68.183.102.57`
   - TO: `64.225.3.13`

## 📋 **Cloudflare DNS Updates Required**

Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **mech.is** → **DNS** → **Records**

### **Edit these existing records:**

| Record | Change IP From | Change IP To | Action |
|--------|----------------|--------------|--------|
| `storage` | `174.138.68.108` | `167.99.50.167` | ✏️ Edit |
| `indexer` | `174.138.68.108` | `165.227.71.77` | ✏️ Edit |
| `search` | `159.65.38.23` | `192.81.212.16` | ✏️ Edit |
| `queue` | `174.138.68.108` | `167.71.80.180` | ✏️ Edit |
| `llm` | `68.183.102.57` | `64.225.3.13` | ✏️ Edit |

### **Keep these as-is (correct):**
- ✅ `sequences` → `159.65.38.23`
- ✅ `reader` → `165.227.194.103`

## 🎯 **Expected Result After Fix**

All domains should resolve to correct IPs and be accessible:

```bash
# These should work after DNS fixes:
curl https://storage.mech.is/health
curl https://indexer.mech.is/health  
curl https://search.mech.is/health
curl https://queue.mech.is/health
curl https://llm.mech.is/health
```

## ⚡ **Quick Fix Script**

If you refresh your Cloudflare authentication, you can use this script:

```bash
# Re-authenticate first
wrangler login

# Then update DNS records via API
# (Script in configure_mech_dns.sh needs fresh token)
```

## 🔍 **Root Cause Analysis**

The DNS records appear to be pointing to old/incorrect servers, possibly from:
- Previous deployment attempts
- Old droplet IPs that were reassigned
- Manual DNS configuration that wasn't updated

**Priority**: Fix these DNS mappings immediately to restore service access via domains.