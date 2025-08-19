# Cloudflare DNS Setup for MECH Services

## 🌐 **Manual DNS Configuration Required**

The OAuth token appears to have expired. Here's how to manually configure DNS records for all MECH services:

## 🎯 **DNS Records to Create**

Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **mech.is** → **DNS** → **Records**

### **Add these A Records:**

| Subdomain | Target IP | Proxied | Service |
|-----------|----------|---------|---------|
| `storage` | `167.99.50.167` | ✅ Yes | mech-storage |
| `indexer` | `165.227.71.77` | ✅ Yes | mech-indexer |
| `sequences` | `159.65.38.23` | ✅ Yes | mech-sequences |
| `search` | `192.81.212.16` | ✅ Yes | mech-search |
| `reader` | `165.227.194.103` | ✅ Yes | mech-reader |
| **`queue`** | **`167.71.80.180`** | ✅ Yes | **mech-queue (NEW)** |
| **`llm`** | **`64.225.3.13`** | ✅ Yes | **mech-llms (NEW)** |

## 📋 **Step-by-Step Instructions**

### **For Each Record:**

1. **Click "Add record"**
2. **Type**: Select `A`
3. **Name**: Enter subdomain (e.g., `queue`)
4. **IPv4 address**: Enter the target IP
5. **Proxy status**: ✅ **Enable** (orange cloud)
6. **TTL**: Auto
7. **Click "Save"**

## 🚀 **Alternative: Quick CLI Setup**

If you want to refresh your Cloudflare authentication:

```bash
# Re-authenticate with Cloudflare
wrangler login

# Then run this script with fresh token:
# (Replace TOKEN with new one from ~/.wrangler/config/default.toml)
```

## ✅ **After DNS Setup**

Your MECH services will be accessible at:

- ✅ https://storage.mech.is (deployed)
- ✅ https://indexer.mech.is (deployed)
- ✅ https://sequences.mech.is (deployed)
- ✅ https://search.mech.is (deployed)
- ✅ https://reader.mech.is (deployed)
- 🆕 https://queue.mech.is (newly deployed)
- 🆕 https://llm.mech.is (newly deployed)

## 🕐 **DNS Propagation**

- **Cloudflare**: Usually 1-5 minutes
- **Global propagation**: Up to 24 hours (but typically 15-30 minutes)

## 🧪 **Test Your Setup**

```bash
# Test health endpoints (after DNS propagation)
curl https://queue.mech.is/health
curl https://llm.mech.is/health

# Test all services
curl https://storage.mech.is/health
curl https://indexer.mech.is/health
curl https://sequences.mech.is/health
curl https://search.mech.is/health
curl https://reader.mech.is/health
```

## 🔧 **If You Prefer CLI Method**

1. **Re-authenticate**: `wrangler login`
2. **Get new token**: `cat ~/.wrangler/config/default.toml`
3. **Run the DNS setup script** with the fresh token

## 📊 **Expected Results**

Once configured, you'll have:
- **7/7 MECH services** with custom domains
- **SSL certificates** automatically provisioned
- **CDN acceleration** via Cloudflare
- **DDoS protection** included
- **Professional .mech.is branding**

## ⚡ **Benefits**

✅ **No port numbers** in URLs  
✅ **HTTPS everywhere** with automatic SSL  
✅ **Global CDN** for faster access  
✅ **Security** with Cloudflare protection  
✅ **Professional appearance** for your services  

---

**Next Step**: Configure these DNS records in Cloudflare Dashboard, then test the endpoints!