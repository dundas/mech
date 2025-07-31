#!/usr/bin/env node

const https = require('https');

const oauth_token = "5eGv1uUb_UCy707_iZtH8BVZgXEb9GXo5rHNOHW1nko.DRKNvW50czOgt3TgIy1L3RzrF53mbMKien1wtuQcjWc";

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: '/client/v4' + path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + oauth_token,
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
  try {
    console.log('🔍 Fetching your Cloudflare domains...\n');
    
    const zones = await makeRequest('/zones');
    
    if (!zones || zones.length === 0) {
      console.log('No domains found in your Cloudflare account.');
      return;
    }
    
    console.log('📋 Available domains:');
    zones.forEach((zone, index) => {
      console.log(`${index + 1}. ${zone.name}`);
    });
    
    // Use the first domain or look for a specific one
    let selectedZone = zones[0];
    
    // Check if any domain contains "referwith" or "helloconvo"
    const preferredDomains = zones.filter(z => 
      z.name.includes('referwith') || 
      z.name.includes('helloconvo') ||
      z.name.includes('queue')
    );
    
    if (preferredDomains.length > 0) {
      selectedZone = preferredDomains[0];
    }
    
    console.log(`\n✅ Selected domain: ${selectedZone.name}`);
    
    const domain = selectedZone.name;
    const zoneId = selectedZone.id;
    const subdomain = 'queue'; // Using 'queue' as subdomain
    const recordName = `${subdomain}.${domain}`;
    const targetIP = '138.197.15.235';
    
    console.log(`📝 Creating DNS record: ${recordName} → ${targetIP}`);
    
    // Check for existing records
    const existingRecords = await makeRequest(`/zones/${zoneId}/dns_records?name=${recordName}&type=A`);
    
    if (existingRecords && existingRecords.length > 0) {
      console.log('⚠️  Found existing record, updating...');
      await makeRequest(
        `/zones/${zoneId}/dns_records/${existingRecords[0].id}`,
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
        `/zones/${zoneId}/dns_records`,
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
    
    console.log('\n✅ DNS record configured successfully!');
    console.log('\n🎉 Your queue service is now available at:');
    console.log(`   https://${recordName}/health`);
    console.log(`   https://${recordName}/api/queues/stats`);
    console.log(`   https://${recordName}/metrics`);
    console.log('\n⏱️  DNS propagation typically takes 1-5 minutes.');
    console.log('\n💡 Test it with:');
    console.log(`   curl https://${recordName}/health`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

configureDNS();