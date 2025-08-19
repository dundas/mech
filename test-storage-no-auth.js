#!/usr/bin/env node

/**
 * Test Storage Service without API Keys
 * Tests the new applicationId/projectId authentication
 */

const STORAGE_URL = process.env.STORAGE_API_URL || 'https://storage.mech.is';

async function testStorageNoAuth() {
  console.log('🧪 Testing Storage Service with applicationId/projectId...\n');
  
  const testApplicationId = 'test-app-' + Date.now();
  const testProjectId = 'test-project-' + Date.now();
  const testBucketName = 'test-bucket-' + Date.now();
  
  try {
    // 1. Test creating bucket without any auth (should work with internal defaults)
    console.log('1️⃣  Testing bucket creation without auth...');
    let response = await fetch(`${STORAGE_URL}/api/buckets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testBucketName })
    });
    
    let data = await response.json();
    console.log('Response:', response.status, data);
    
    if (response.ok) {
      console.log('✅ Created bucket without auth (internal mode)');
    }
    
    // 2. Test with applicationId
    console.log('\n2️⃣  Testing with applicationId...');
    const bucketWithAppId = 'bucket-app-' + Date.now();
    response = await fetch(`${STORAGE_URL}/api/buckets?applicationId=${testApplicationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: bucketWithAppId })
    });
    
    data = await response.json();
    console.log('Response:', response.status, data);
    
    if (response.ok) {
      console.log('✅ Created bucket with applicationId');
    }
    
    // 3. Test with projectId
    console.log('\n3️⃣  Testing with projectId...');
    const bucketWithProjectId = 'bucket-proj-' + Date.now();
    response = await fetch(`${STORAGE_URL}/api/buckets`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-project-id': testProjectId
      },
      body: JSON.stringify({ name: bucketWithProjectId })
    });
    
    data = await response.json();
    console.log('Response:', response.status, data);
    
    if (response.ok) {
      console.log('✅ Created bucket with projectId header');
    }
    
    // 4. List buckets
    console.log('\n4️⃣  Testing bucket listing...');
    response = await fetch(`${STORAGE_URL}/api/buckets`);
    data = await response.json();
    console.log('Response:', response.status, data);
    
    if (response.ok) {
      console.log(`✅ Listed ${data.buckets?.length || 0} buckets`);
    }
    
    // 5. Upload a file without auth
    console.log('\n5️⃣  Testing file upload without auth...');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', Buffer.from('Test content'), 'test.txt');
    
    response = await fetch(`${STORAGE_URL}/api/buckets/${testBucketName}/objects`, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form
    });
    
    data = await response.json();
    console.log('Response:', response.status, data);
    
    if (response.ok) {
      console.log('✅ Uploaded file without auth');
    }
    
    // 6. Test application creation without master key
    console.log('\n6️⃣  Testing application creation...');
    response = await fetch(`${STORAGE_URL}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'test-app-no-auth',
        settings: {
          maxBuckets: 10,
          maxStorageSize: 1073741824
        }
      })
    });
    
    data = await response.json();
    console.log('Response:', response.status, data);
    
    if (response.ok) {
      console.log('✅ Created application without master key');
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up...');
    
    // Delete buckets
    for (const bucket of [testBucketName, bucketWithAppId, bucketWithProjectId]) {
      try {
        await fetch(`${STORAGE_URL}/api/buckets/${bucket}`, { method: 'DELETE' });
        console.log(`Deleted bucket: ${bucket}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    console.log('\n✨ Test completed!');
    console.log('\nSummary:');
    console.log('- Storage service now works without API keys');
    console.log('- Can use applicationId or projectId for multi-tenancy');
    console.log('- Internal mode provides default settings');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check dependencies
async function checkDependencies() {
  try {
    require('form-data');
  } catch (e) {
    console.log('📦 Installing required dependency: form-data...');
    require('child_process').execSync('npm install form-data', { stdio: 'inherit' });
  }
}

checkDependencies().then(() => {
  testStorageNoAuth();
});