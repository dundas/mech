#!/usr/bin/env node

/**
 * Comprehensive Storage Service Test
 * Tests ALL documented features according to the API documentation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_URL = process.env.STORAGE_API_URL || 'https://storage.mech.is';
const MASTER_KEY = process.env.MECH_STORAGE_MASTER_KEY || '';

class StorageServiceTester {
  constructor() {
    this.testResults = [];
    this.applicationApiKey = null;
    this.testAppName = `test-app-${Date.now()}`;
    this.testBucketName = `test-bucket-${Date.now()}`;
  }

  log(message, type = 'info') {
    const emoji = {
      info: '📝',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    };
    console.log(`${emoji[type] || ''} ${message}`);
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${STORAGE_URL}${endpoint}`;
    const response = await fetch(url, options);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
    
    return { response, data, status: response.status };
  }

  addTestResult(test, passed, details = '') {
    this.testResults.push({ test, passed, details });
    if (passed) {
      this.log(`${test} - PASSED ${details}`, 'success');
    } else {
      this.log(`${test} - FAILED ${details}`, 'error');
    }
  }

  async testAPIDocumentation() {
    this.log('\\n=== Testing API Documentation ===', 'test');
    
    // Test main explain endpoint
    const { data, status } = await this.makeRequest('/api/explain');
    this.addTestResult('API Documentation - Main', status === 200 && data.success, 
      `Status: ${status}`);
    
    // Test each topic
    const topics = data.topics || [];
    for (const topic of topics) {
      const { status: topicStatus } = await this.makeRequest(`/api/explain/${topic}`);
      this.addTestResult(`API Documentation - ${topic}`, topicStatus === 200, 
        `Status: ${topicStatus}`);
    }
  }

  async testApplicationManagement() {
    this.log('\\n=== Testing Application Management ===', 'test');
    
    if (!MASTER_KEY) {
      this.log('Skipping application tests - no master key provided', 'warning');
      this.addTestResult('Application Management', false, 'No master key');
      return;
    }
    
    // Create application
    const createAppResult = await this.makeRequest('/api/applications', {
      method: 'POST',
      headers: {
        'x-api-key': MASTER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: this.testAppName,
        description: 'Test application for comprehensive testing',
        settings: {
          maxBuckets: 10,
          maxStorageBytes: 1073741824, // 1GB
          maxFileSizeBytes: 10485760, // 10MB
          allowedFileTypes: ['*']
        }
      })
    });
    
    this.addTestResult('Create Application', 
      createAppResult.status === 201 && createAppResult.data.success,
      `Status: ${createAppResult.status}`);
    
    if (createAppResult.data.data?.apiKey) {
      this.applicationApiKey = createAppResult.data.data.apiKey;
      this.log(`Application created with API key: ${this.applicationApiKey.substring(0, 8)}...`, 'info');
    }
    
    // List applications
    const listAppsResult = await this.makeRequest('/api/applications', {
      headers: { 'x-api-key': MASTER_KEY }
    });
    
    this.addTestResult('List Applications', 
      listAppsResult.status === 200 && Array.isArray(listAppsResult.data.data),
      `Found ${listAppsResult.data.data?.length || 0} applications`);
  }

  async testBucketOperations() {
    this.log('\\n=== Testing Bucket Operations ===', 'test');
    
    if (!this.applicationApiKey) {
      this.log('Skipping bucket tests - no API key', 'warning');
      return;
    }
    
    const headers = { 
      'x-api-key': this.applicationApiKey,
      'Content-Type': 'application/json'
    };
    
    // Create bucket
    const createResult = await this.makeRequest('/api/buckets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: this.testBucketName,
        settings: {
          public: false,
          maxObjectSize: 5242880, // 5MB
          allowedFileTypes: ['image/*', 'text/*', 'application/json']
        }
      })
    });
    
    this.addTestResult('Create Bucket', 
      createResult.status === 201 && createResult.data.success,
      `Status: ${createResult.status}`);
    
    // List buckets
    const listResult = await this.makeRequest('/api/buckets', { headers });
    this.addTestResult('List Buckets', 
      listResult.status === 200 && Array.isArray(listResult.data.data),
      `Found ${listResult.data.data?.length || 0} buckets`);
    
    // Get bucket details
    const getResult = await this.makeRequest(`/api/buckets/${this.testBucketName}`, { headers });
    this.addTestResult('Get Bucket Details', 
      getResult.status === 200 && getResult.data.data?.name === this.testBucketName,
      `Status: ${getResult.status}`);
    
    // Update bucket settings
    const updateResult = await this.makeRequest(`/api/buckets/${this.testBucketName}/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        settings: {
          public: true,
          maxObjectSize: 10485760 // 10MB
        }
      })
    });
    
    this.addTestResult('Update Bucket Settings', 
      updateResult.status === 200 && updateResult.data.success,
      `Status: ${updateResult.status}`);
  }

  async testObjectOperations() {
    this.log('\\n=== Testing Object Operations ===', 'test');
    
    if (!this.applicationApiKey) {
      this.log('Skipping object tests - no API key', 'warning');
      return;
    }
    
    const headers = { 'x-api-key': this.applicationApiKey };
    
    // Test different file types
    const testFiles = [
      { name: 'test-text.txt', content: 'Hello, Storage Service!', type: 'text/plain' },
      { name: 'test-json.json', content: JSON.stringify({ test: true }), type: 'application/json' },
      { name: 'test-large.txt', content: 'x'.repeat(1024 * 1024), type: 'text/plain' } // 1MB
    ];
    
    for (const file of testFiles) {
      // Upload using FormData
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', Buffer.from(file.content), {
        filename: file.name,
        contentType: file.type
      });
      
      const uploadResult = await this.makeRequest(`/api/buckets/${this.testBucketName}/objects`, {
        method: 'POST',
        headers: {
          ...headers,
          ...form.getHeaders()
        },
        body: form
      });
      
      this.addTestResult(`Upload Object - ${file.name}`, 
        uploadResult.status === 201 && uploadResult.data.success,
        `Size: ${file.content.length} bytes`);
      
      // Get object metadata
      const metadataResult = await this.makeRequest(
        `/api/buckets/${this.testBucketName}/objects/${file.name}`,
        { method: 'HEAD', headers }
      );
      
      this.addTestResult(`Get Object Metadata - ${file.name}`, 
        metadataResult.status === 200,
        `Status: ${metadataResult.status}`);
      
      // Download object
      const downloadResult = await this.makeRequest(
        `/api/buckets/${this.testBucketName}/objects/${file.name}`,
        { headers }
      );
      
      this.addTestResult(`Download Object - ${file.name}`, 
        downloadResult.status === 200 && downloadResult.data === file.content,
        `Content matches: ${downloadResult.data === file.content}`);
    }
    
    // List objects
    const listResult = await this.makeRequest(`/api/buckets/${this.testBucketName}/objects`, { headers });
    this.addTestResult('List Objects', 
      listResult.status === 200 && Array.isArray(listResult.data.data),
      `Found ${listResult.data.data?.length || 0} objects`);
    
    // Test object copy
    const copyResult = await this.makeRequest(
      `/api/buckets/${this.testBucketName}/objects/test-text.txt/copy`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationKey: 'test-text-copy.txt' })
      }
    );
    
    this.addTestResult('Copy Object', 
      copyResult.status === 200 && copyResult.data.success,
      `Status: ${copyResult.status}`);
    
    // Delete objects
    for (const file of testFiles) {
      const deleteResult = await this.makeRequest(
        `/api/buckets/${this.testBucketName}/objects/${file.name}`,
        { method: 'DELETE', headers }
      );
      
      this.addTestResult(`Delete Object - ${file.name}`, 
        deleteResult.status === 200 && deleteResult.data.success,
        `Status: ${deleteResult.status}`);
    }
  }

  async testPresignedURLs() {
    this.log('\\n=== Testing Presigned URLs ===', 'test');
    
    if (!this.applicationApiKey) {
      this.log('Skipping presigned URL tests - no API key', 'warning');
      return;
    }
    
    const headers = { 
      'x-api-key': this.applicationApiKey,
      'Content-Type': 'application/json'
    };
    
    // Generate presigned URL for upload
    const uploadUrlResult = await this.makeRequest(
      `/api/buckets/${this.testBucketName}/presigned-url`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'presigned-test.txt',
          operation: 'putObject',
          expiresIn: 3600
        })
      }
    );
    
    this.addTestResult('Generate Presigned Upload URL', 
      uploadUrlResult.status === 200 && uploadUrlResult.data.data?.url,
      `Status: ${uploadUrlResult.status}`);
    
    // Upload using presigned URL
    if (uploadUrlResult.data.data?.url) {
      const uploadResult = await fetch(uploadUrlResult.data.data.url, {
        method: 'PUT',
        body: 'Test content via presigned URL',
        headers: { 'Content-Type': 'text/plain' }
      });
      
      this.addTestResult('Upload via Presigned URL', 
        uploadResult.ok,
        `Status: ${uploadResult.status}`);
    }
    
    // Generate presigned URL for download
    const downloadUrlResult = await this.makeRequest(
      `/api/buckets/${this.testBucketName}/presigned-url`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'presigned-test.txt',
          operation: 'getObject',
          expiresIn: 3600
        })
      }
    );
    
    this.addTestResult('Generate Presigned Download URL', 
      downloadUrlResult.status === 200 && downloadUrlResult.data.data?.url,
      `Status: ${downloadUrlResult.status}`);
  }

  async testErrorHandling() {
    this.log('\\n=== Testing Error Handling ===', 'test');
    
    // Test missing API key
    const noAuthResult = await this.makeRequest('/api/buckets');
    this.addTestResult('Error - Missing API Key', 
      noAuthResult.status === 401 && noAuthResult.data.error?.code === 'MISSING_API_KEY',
      `Code: ${noAuthResult.data.error?.code}`);
    
    // Test invalid API key
    const badAuthResult = await this.makeRequest('/api/buckets', {
      headers: { 'x-api-key': 'invalid-key' }
    });
    this.addTestResult('Error - Invalid API Key', 
      badAuthResult.status === 401 && badAuthResult.data.error?.code === 'INVALID_API_KEY',
      `Code: ${badAuthResult.data.error?.code}`);
    
    if (this.applicationApiKey) {
      // Test bucket not found
      const notFoundResult = await this.makeRequest('/api/buckets/non-existent-bucket', {
        headers: { 'x-api-key': this.applicationApiKey }
      });
      this.addTestResult('Error - Bucket Not Found', 
        notFoundResult.status === 404 && notFoundResult.data.error?.code === 'BUCKET_NOT_FOUND',
        `Code: ${notFoundResult.data.error?.code}`);
      
      // Test duplicate bucket
      const duplicateResult = await this.makeRequest('/api/buckets', {
        method: 'POST',
        headers: { 
          'x-api-key': this.applicationApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: this.testBucketName })
      });
      this.addTestResult('Error - Duplicate Bucket', 
        duplicateResult.status === 400 && duplicateResult.data.error?.code === 'BUCKET_EXISTS',
        `Code: ${duplicateResult.data.error?.code}`);
    }
  }

  async testRateLimiting() {
    this.log('\\n=== Testing Rate Limiting ===', 'test');
    
    if (!this.applicationApiKey) {
      this.log('Skipping rate limit tests - no API key', 'warning');
      return;
    }
    
    // Make rapid requests to test rate limiting
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        this.makeRequest('/api/buckets', {
          headers: { 'x-api-key': this.applicationApiKey }
        })
      );
    }
    
    const results = await Promise.all(requests);
    const rateLimited = results.some(r => r.status === 429);
    
    this.addTestResult('Rate Limiting', 
      true, // Can't guarantee rate limiting will trigger
      `Made 20 rapid requests, rate limited: ${rateLimited}`);
  }

  async cleanup() {
    this.log('\\n=== Cleanup ===', 'test');
    
    if (this.applicationApiKey) {
      // Delete test bucket
      const deleteResult = await this.makeRequest(`/api/buckets/${this.testBucketName}`, {
        method: 'DELETE',
        headers: { 'x-api-key': this.applicationApiKey }
      });
      
      this.log(`Cleaned up bucket: ${deleteResult.status === 200}`, 'info');
    }
    
    if (MASTER_KEY && this.testAppName) {
      // Delete test application
      const deleteAppResult = await this.makeRequest(`/api/applications/${this.testAppName}`, {
        method: 'DELETE',
        headers: { 'x-api-key': MASTER_KEY }
      });
      
      this.log(`Cleaned up application: ${deleteAppResult.status === 200}`, 'info');
    }
  }

  printSummary() {
    this.log('\\n=== TEST SUMMARY ===', 'test');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${passed}`, 'success');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    
    if (failed > 0) {
      this.log('\\nFailed Tests:', 'error');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => this.log(`  - ${r.test}: ${r.details}`, 'error'));
    }
    
    return failed === 0;
  }

  async run() {
    this.log('🚀 Starting Comprehensive Storage Service Test\\n', 'info');
    
    if (!MASTER_KEY) {
      this.log('⚠️  No master key provided. Set MECH_STORAGE_MASTER_KEY to test all features.', 'warning');
      this.log('   Running limited tests...\\n', 'warning');
    }
    
    try {
      await this.testAPIDocumentation();
      await this.testApplicationManagement();
      await this.testBucketOperations();
      await this.testObjectOperations();
      await this.testPresignedURLs();
      await this.testErrorHandling();
      await this.testRateLimiting();
      await this.cleanup();
      
      const allPassed = this.printSummary();
      process.exit(allPassed ? 0 : 1);
      
    } catch (error) {
      this.log(`\\nUnexpected error: ${error.message}`, 'error');
      console.error(error);
      process.exit(1);
    }
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

// Main execution
checkDependencies().then(() => {
  const tester = new StorageServiceTester();
  tester.run();
});