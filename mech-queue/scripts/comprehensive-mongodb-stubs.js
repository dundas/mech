#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Creating comprehensive MongoDB dependency stubs...');

// All MongoDB optional dependencies that can cause issues
const stubs = [
  // Client-side encryption providers
  'node_modules/mongodb/lib/client-side-encryption/providers/azure.js',
  'node_modules/mongodb/lib/client-side-encryption/providers/aws.js', 
  'node_modules/mongodb/lib/client-side-encryption/providers/gcp.js',
  
  // OIDC authentication workflows
  'node_modules/mongodb/lib/cmap/auth/mongodb_oidc/azure_machine_workflow.js',
  'node_modules/mongodb/lib/cmap/auth/mongodb_oidc/azure_service_workflow.js',
  'node_modules/mongodb/lib/cmap/auth/mongodb_oidc/gcp_machine_workflow.js',
  'node_modules/mongodb/lib/cmap/auth/mongodb_oidc/gcp_service_workflow.js',
  
  // AWS SDK packages
  'node_modules/@aws-sdk/credential-providers/package.json',
  'node_modules/@aws-sdk/credential-providers/index.js',
  
  // GCP packages
  'node_modules/gcp-metadata/package.json',
  'node_modules/gcp-metadata/index.js',
  
  // MongoDB client encryption
  'node_modules/mongodb-client-encryption/package.json',
  'node_modules/mongodb-client-encryption/index.js'
];

const stubContent = 'module.exports = {};';
const packageStubContent = '{"name": "stub", "version": "0.0.0", "main": "index.js"}';

let created = 0;

stubs.forEach(stubPath => {
  const fullPath = path.resolve(stubPath);
  const dir = path.dirname(fullPath);
  
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(fullPath)) {
      const content = stubPath.includes('package.json') ? packageStubContent : stubContent;
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Created: ${stubPath}`);
      created++;
    }
  } catch (error) {
    console.error(`❌ Failed: ${stubPath}`, error.message);
  }
});

console.log(`\n📋 Created ${created} MongoDB stubs`);
console.log('🎯 MongoDB dependencies should now work!');
