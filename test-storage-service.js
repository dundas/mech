#!/usr/bin/env node

/**
 * Storage Service Functionality Test
 * Tests all major operations: upload, list, download, delete
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const STORAGE_API_URL = process.env.STORAGE_API_URL || 'https://storage.mech.is';
const API_KEY = process.env.MECH_STORAGE_API_KEY || 'test-api-key';
const TEST_BUCKET = 'test-bucket-' + Date.now();

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(endpoint, options = {}) {
  const url = `${STORAGE_API_URL}${endpoint}`;
  const defaultHeaders = {
    'x-api-key': API_KEY
  };
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });
  
  const responseText = await response.text();
  let data;
  
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    data = responseText;
  }
  
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} - ${JSON.stringify(data)}`);
  }
  
  return { response, data };
}

async function runTests() {
  log('\\n🧪 Starting Storage Service Tests...\\n', 'blue');
  
  try {
    // Test 1: Check service health
    log('1️⃣  Testing service health...', 'yellow');
    const { data: healthData } = await makeRequest('/health');
    log(`✅ Service is healthy: ${healthData.service} v${healthData.version}`, 'green');
    
    // Test 2: Create a test bucket
    log('\\n2️⃣  Creating test bucket...', 'yellow');
    const { data: bucketData } = await makeRequest('/api/buckets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: TEST_BUCKET,
        settings: {
          public: false,
          maxObjectSize: 10485760, // 10MB
          allowedFileTypes: ['*']
        }
      })
    });
    log(`✅ Created bucket: ${bucketData.data.name}`, 'green');
    
    // Test 3: List buckets
    log('\\n3️⃣  Listing buckets...', 'yellow');
    const { data: bucketsData } = await makeRequest('/api/buckets');
    const bucketCount = bucketsData.data.length;
    log(`✅ Found ${bucketCount} bucket(s)`, 'green');
    
    // Test 4: Upload a test file
    log('\\n4️⃣  Uploading test file...', 'yellow');
    
    // Create a test file
    const testFileName = 'test-file.txt';
    const testFileContent = `Test file uploaded at ${new Date().toISOString()}\\nThis is a test of the Mech Storage Service.`;
    const testFilePath = path.join(__dirname, testFileName);
    fs.writeFileSync(testFilePath, testFileContent);
    
    // Upload using FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath), testFileName);
    
    const uploadResponse = await fetch(`${STORAGE_API_URL}/api/buckets/${TEST_BUCKET}/objects`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        ...form.getHeaders()
      },
      body: form
    });
    
    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} - ${JSON.stringify(uploadData)}`);
    }
    
    log(`✅ Uploaded file: ${uploadData.data.key} (${uploadData.data.size} bytes)`, 'green');
    
    // Clean up local test file
    fs.unlinkSync(testFilePath);
    
    // Test 5: List objects in bucket
    log('\\n5️⃣  Listing objects in bucket...', 'yellow');
    const { data: objectsData } = await makeRequest(`/api/buckets/${TEST_BUCKET}/objects`);
    log(`✅ Found ${objectsData.data.length} object(s) in bucket`, 'green');
    objectsData.data.forEach(obj => {
      log(`   📄 ${obj.key} (${obj.size} bytes)`, 'blue');
    });
    
    // Test 6: Download the uploaded file
    log('\\n6️⃣  Downloading uploaded file...', 'yellow');
    const { response: downloadResponse } = await makeRequest(`/api/buckets/${TEST_BUCKET}/objects/${testFileName}`);
    const downloadedContent = await downloadResponse.text();
    
    if (downloadedContent === testFileContent) {
      log('✅ Downloaded file content matches uploaded content', 'green');
    } else {
      throw new Error('Downloaded content does not match uploaded content');
    }
    
    // Test 7: Get object metadata
    log('\\n7️⃣  Getting object metadata...', 'yellow');
    const metadataResponse = await fetch(`${STORAGE_API_URL}/api/buckets/${TEST_BUCKET}/objects/${testFileName}`, {
      method: 'HEAD',
      headers: {
        'x-api-key': API_KEY
      }
    });
    
    if (metadataResponse.ok) {
      log('✅ Retrieved object metadata:', 'green');
      log(`   Content-Type: ${metadataResponse.headers.get('content-type')}`, 'blue');
      log(`   Content-Length: ${metadataResponse.headers.get('content-length')}`, 'blue');
      log(`   ETag: ${metadataResponse.headers.get('etag')}`, 'blue');
    }
    
    // Test 8: Generate presigned URL
    log('\\n8️⃣  Generating presigned URL...', 'yellow');
    const { data: presignedData } = await makeRequest(`/api/buckets/${TEST_BUCKET}/presigned-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: testFileName,
        operation: 'getObject',
        expiresIn: 3600
      })
    });
    log(`✅ Generated presigned URL (expires in 1 hour)`, 'green');
    log(`   URL: ${presignedData.data.url.substring(0, 80)}...`, 'blue');
    
    // Test 9: Delete the uploaded file
    log('\\n9️⃣  Deleting uploaded file...', 'yellow');
    await makeRequest(`/api/buckets/${TEST_BUCKET}/objects/${testFileName}`, {
      method: 'DELETE'
    });
    log('✅ Deleted file successfully', 'green');
    
    // Test 10: Delete the test bucket
    log('\\n🔟  Cleaning up test bucket...', 'yellow');
    await makeRequest(`/api/buckets/${TEST_BUCKET}`, {
      method: 'DELETE'
    });
    log('✅ Deleted test bucket', 'green');
    
    // Summary
    log('\\n✨ All tests passed successfully! ✨', 'green');
    log('\\nStorage service is fully functional with:', 'blue');
    log('  ✓ Bucket creation and management', 'green');
    log('  ✓ File upload and download', 'green');
    log('  ✓ Object listing and metadata', 'green');
    log('  ✓ Presigned URL generation', 'green');
    log('  ✓ Object deletion', 'green');
    
  } catch (error) {
    log(`\\n❌ Test failed: ${error.message}`, 'red');
    
    // Cleanup on error
    try {
      await makeRequest(`/api/buckets/${TEST_BUCKET}`, { method: 'DELETE' });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

// Check if form-data is installed
try {
  require.resolve('form-data');
} catch (e) {
  log('Installing required dependency: form-data...', 'yellow');
  require('child_process').execSync('npm install form-data', { stdio: 'inherit' });
}

// Run the tests
runTests();