#!/usr/bin/env node

const https = require('https');
const { execSync } = require('child_process');

// Get the auth token from wrangler config
let token;
try {
  const configOutput = execSync('cat ~/.wrangler/config/default.toml 2>/dev/null', { encoding: 'utf8' });
  const tokenMatch = configOutput.match(/CLOUDFLARE_API_TOKEN = "([^"]+)"/);
  
  if (!tokenMatch) {
    // Try alternative location
    const configAlt = execSync('cat ~/.wrangler/.wrangler/config/default.toml 2>/dev/null', { encoding: 'utf8' });
    const tokenAltMatch = configAlt.match(/CLOUDFLARE_API_TOKEN = "([^"]+)"/);
    token = tokenAltMatch ? tokenAltMatch[1] : null;
  } else {
    token = tokenMatch[1];
  }
} catch (e) {
  console.error('Could not read wrangler config. Trying environment variable...');
  token = process.env.CLOUDFLARE_API_TOKEN;
}

if (!token) {
  console.error('❌ Could not find Cloudflare API token. Please run "wrangler login" first.');
  process.exit(1);
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: '/client/v4' + path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.success) {
            resolve(response.result);
          } else {
            reject(new Error(response.errors?.[0]?.message || 'Unknown error'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function listDomains() {
  console.log('🔍 Fetching your Cloudflare domains...\n');
  
  try {
    const zones = await makeRequest('/zones');
    
    if (!zones || zones.length === 0) {
      console.log('No domains found in your Cloudflare account.');
      return;
    }
    
    console.log('📋 Your Cloudflare domains:\n');
    zones.forEach((zone, index) => {
      console.log(`${index + 1}. ${zone.name} (Zone ID: ${zone.id})`);
      console.log(`   Status: ${zone.status}`);
      console.log(`   Plan: ${zone.plan.name}\n`);
    });
    
    console.log(`Total: ${zones.length} domain(s)\n`);
    
    // Save first domain for easy access
    if (zones.length > 0) {
      console.log(`💡 To configure DNS for ${zones[0].name}, I'll create an automated script.`);
      
      // Create automated DNS setup for the first domain
      const domain = zones[0].name;
      const zoneId = zones[0].id;
      
      const setupScript = `
const https = require('https');

const token = '${token}';
const domain = '${domain}';
const zoneId = '${zoneId}';
const subdomain = 'api'; // Change this if you want a different subdomain
const targetIP = '138.197.15.235';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: '/client/v4' + path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.success) {
            resolve(response.result);
          } else {
            reject(new Error(response.errors?.[0]?.message || 'Unknown error'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function setupDNS() {
  const recordName = subdomain + '.' + domain;
  
  console.log('🔧 Setting up DNS for ' + recordName + ' → ' + targetIP);
  
  // Check for existing records
  const existingRecords = await makeRequest('/zones/' + zoneId + '/dns_records?name=' + recordName + '&type=A');
  
  if (existingRecords && existingRecords.length > 0) {
    console.log('⚠️  Found existing record, updating...');
    await makeRequest(
      '/zones/' + zoneId + '/dns_records/' + existingRecords[0].id,
      'PUT',
      {
        type: 'A',
        name: subdomain,
        content: targetIP,
        ttl: 1,
        proxied: true
      }
    );
  } else {
    console.log('📝 Creating new DNS record...');
    await makeRequest(
      '/zones/' + zoneId + '/dns_records',
      'POST',
      {
        type: 'A',
        name: subdomain,
        content: targetIP,
        ttl: 1,
        proxied: true
      }
    );
  }
  
  console.log('\\n✅ Success! Your queue service is now available at:');
  console.log('   https://' + recordName + '/health');
  console.log('   https://' + recordName + '/api/queues/stats');
  console.log('   https://' + recordName + '/metrics');
}

setupDNS().catch(console.error);
`;
      
      require('fs').writeFileSync('setup-dns-' + domain.replace(/\./g, '-') + '.js', setupScript);
      console.log(`\n✅ Created setup script: setup-dns-${domain.replace(/\./g, '-')}.js`);
      console.log(`   Run it with: node setup-dns-${domain.replace(/\./g, '-')}.js`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listDomains();