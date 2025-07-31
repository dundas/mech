#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  try {
    console.log('\n🌐 Cloudflare DNS Configuration\n');

    // Get user's domain choice
    const domain = await question('Enter your domain name (e.g., example.com): ');
    const subdomain = await question('Enter subdomain for the queue service (e.g., "api" for api.example.com, or press Enter for root): ');

    const recordName = subdomain ? `${subdomain}.${domain}` : domain;
    
    console.log(`\n📝 Will create DNS record: ${recordName} → 138.197.15.235`);
    
    const confirm = await question('Proceed? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Setup cancelled');
      process.exit(0);
    }

    // Get zone ID
    console.log('\n🔍 Looking up zone ID...');
    const zonesOutput = execSync('curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=' + domain + '" -H "Authorization: Bearer $(wrangler config list | grep CLOUDFLARE_API_TOKEN | cut -d= -f2)" -H "Content-Type: application/json"', { encoding: 'utf8' });
    
    // Since we can't parse the token directly, let's use cf-api command if available, or use a different approach
    console.log('\n⚙️  Using Cloudflare API via curl...');
    
    // Create a temporary script to handle the DNS configuration
    const scriptContent = `
const https = require('https');
const { execSync } = require('child_process');

// Get the auth token from wrangler config
const configOutput = execSync('cat ~/.wrangler/config/default.toml 2>/dev/null || echo ""', { encoding: 'utf8' });
const tokenMatch = configOutput.match(/CLOUDFLARE_API_TOKEN = "([^"]+)"/);

if (!tokenMatch) {
  console.error('❌ Could not find Cloudflare API token. Please run "wrangler login" first.');
  process.exit(1);
}

const token = tokenMatch[1];

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

async function configureDNS() {
  const domain = '${domain}';
  const subdomain = '${subdomain}';
  const recordName = '${recordName}';
  
  console.log('🔍 Finding zone ID for ' + domain);
  
  const zones = await makeRequest('/zones?name=' + domain);
  if (!zones || zones.length === 0) {
    throw new Error('Domain not found in your Cloudflare account');
  }
  
  const zoneId = zones[0].id;
  console.log('✅ Found zone: ' + zoneId);
  
  // Check for existing records
  console.log('🔍 Checking for existing DNS records...');
  const existingRecords = await makeRequest('/zones/' + zoneId + '/dns_records?name=' + recordName + '&type=A');
  
  if (existingRecords && existingRecords.length > 0) {
    console.log('⚠️  Found existing record, updating...');
    await makeRequest(
      '/zones/' + zoneId + '/dns_records/' + existingRecords[0].id,
      'PUT',
      {
        type: 'A',
        name: subdomain || '@',
        content: '138.197.15.235',
        ttl: 1,
        proxied: true
      }
    );
    console.log('✅ DNS record updated!');
  } else {
    console.log('📝 Creating new DNS record...');
    await makeRequest(
      '/zones/' + zoneId + '/dns_records',
      'POST',
      {
        type: 'A',
        name: subdomain || '@',
        content: '138.197.15.235',
        ttl: 1,
        proxied: true
      }
    );
    console.log('✅ DNS record created!');
  }
  
  console.log('\\n🎉 Success! Your queue service will be available at:');
  console.log('   https://' + recordName + '/health');
  console.log('   https://' + recordName + '/api/queues/stats');
  console.log('   https://' + recordName + '/metrics');
  console.log('\\n⏱️  DNS propagation typically takes 1-5 minutes.');
}

configureDNS().catch(console.error);
`;

    // Write and execute the configuration script
    require('fs').writeFileSync('/tmp/cloudflare-dns-config.js', scriptContent);
    execSync('node /tmp/cloudflare-dns-config.js', { stdio: 'inherit' });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main();