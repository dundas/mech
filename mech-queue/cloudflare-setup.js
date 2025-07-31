#!/usr/bin/env node

const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🌐 Cloudflare DNS Configuration Setup\n');

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function makeCloudflareRequest(path, method = 'GET', data = null, token = null, email = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    } else if (email) {
      options.headers['X-Auth-Email'] = email.email;
      options.headers['X-Auth-Key'] = email.key;
    }

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

async function main() {
  try {
    // Get Cloudflare credentials
    console.log('Please provide your Cloudflare credentials:');
    console.log('(You can find these at https://dash.cloudflare.com/profile/api-tokens)\n');
    
    const authMethod = await question('Use API Token (recommended) or Global API Key? (token/key): ');
    
    let auth = {};
    if (authMethod.toLowerCase() === 'token') {
      auth.token = await question('Enter your Cloudflare API Token: ');
    } else {
      auth.email = await question('Enter your Cloudflare email: ');
      auth.key = await question('Enter your Cloudflare Global API Key: ');
    }

    // Get domain
    const domain = await question('\nEnter your domain name (e.g., example.com): ');
    const subdomain = await question('Enter subdomain for the queue service (e.g., "api" for api.example.com): ');

    console.log('\n🔍 Looking up your domain...');
    
    // Get zones
    const zones = await makeCloudflareRequest('/zones?name=' + domain, 'GET', null, auth.token, auth);
    
    if (!zones || zones.length === 0) {
      throw new Error(`Domain ${domain} not found in your Cloudflare account`);
    }

    const zoneId = zones[0].id;
    console.log(`✅ Found domain: ${domain} (Zone ID: ${zoneId})`);

    // Check if record already exists
    const recordName = subdomain ? `${subdomain}.${domain}` : domain;
    console.log(`\n🔍 Checking for existing DNS record: ${recordName}`);
    
    const existingRecords = await makeCloudflareRequest(
      `/zones/${zoneId}/dns_records?name=${recordName}&type=A`, 
      'GET', 
      null, 
      auth.token, 
      auth
    );

    if (existingRecords && existingRecords.length > 0) {
      console.log(`⚠️  Found existing A record for ${recordName}`);
      const overwrite = await question('Overwrite existing record? (yes/no): ');
      
      if (overwrite.toLowerCase() !== 'yes') {
        console.log('❌ Setup cancelled');
        process.exit(0);
      }

      // Delete existing record
      await makeCloudflareRequest(
        `/zones/${zoneId}/dns_records/${existingRecords[0].id}`,
        'DELETE',
        null,
        auth.token,
        auth
      );
      console.log('✅ Deleted existing record');
    }

    // Create new A record
    console.log(`\n📝 Creating DNS A record: ${recordName} → 138.197.15.235`);
    
    const newRecord = await makeCloudflareRequest(
      `/zones/${zoneId}/dns_records`,
      'POST',
      {
        type: 'A',
        name: subdomain || '@',
        content: '138.197.15.235',
        ttl: 1, // Auto
        proxied: true // Enable Cloudflare proxy
      },
      auth.token,
      auth
    );

    console.log('\n✅ DNS record created successfully!');
    console.log(`\n🎉 Your queue service is now available at:`);
    console.log(`   https://${recordName}/health`);
    console.log(`   https://${recordName}/api/queues/stats`);
    console.log(`   https://${recordName}/metrics`);
    
    console.log('\n📌 Notes:');
    console.log('- DNS propagation typically takes 1-5 minutes');
    console.log('- HTTPS is automatically enabled through Cloudflare');
    console.log('- Your origin server IP is now hidden');
    console.log('- DDoS protection is active');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main();