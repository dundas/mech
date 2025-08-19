#!/usr/bin/env node

/**
 * Simple Storage Service Test
 * Tests basic functionality without authentication
 */

const STORAGE_URL = 'https://storage.mech.is';

async function testStorage() {
  console.log('🧪 Testing Mech Storage Service...\n');
  
  try {
    // 1. Test health endpoint
    console.log('1️⃣  Checking service health...');
    const healthResponse = await fetch(`${STORAGE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Service is healthy:', healthData);
    
    // 2. Test explain endpoint (should work without auth)
    console.log('\n2️⃣  Getting API documentation...');
    const explainResponse = await fetch(`${STORAGE_URL}/api/explain`);
    const explainData = await explainResponse.json();
    console.log('✅ API documentation available');
    if (explainData.data && explainData.data.endpoints) {
      console.log('   Available endpoints:', Object.keys(explainData.data.endpoints).length);
    }
    
    // 3. Test bucket list without auth (should fail)
    console.log('\n3️⃣  Testing authentication requirement...');
    const bucketsResponse = await fetch(`${STORAGE_URL}/api/buckets`);
    const bucketsData = await bucketsResponse.json();
    
    if (bucketsResponse.status === 401) {
      console.log('✅ API correctly requires authentication');
      console.log('   Error:', bucketsData.error.message);
    } else {
      console.log('⚠️  Unexpected response:', bucketsResponse.status);
    }
    
    // 4. Show how to get started
    console.log('\n📝 To fully test the storage service:');
    console.log('   1. Create an application and get an API key');
    console.log('   2. Set MECH_STORAGE_API_KEY environment variable');
    console.log('   3. Run: node test-storage-service.js');
    
    console.log('\n✨ Basic connectivity test passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testStorage();