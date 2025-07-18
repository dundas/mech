const http = require('http');

// Test the health endpoint
const testHealthEndpoint = () => {
  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/health',
    method: 'GET'
  }, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      process.exit(0);
    });
  });
  
  req.on('error', (err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
  
  req.end();
};

// Test session creation
const testSessionCreation = () => {
  const sessionData = {
    projectId: 'test-project',
    userId: 'test-user',
    agent: {
      name: 'claude',
      version: '1.0.0',
      model: 'claude-3-opus',
      capabilities: ['reasoning', 'file_operations']
    },
    environment: {
      os: 'darwin',
      arch: 'arm64',
      nodeVersion: 'v20.19.0',
      hostname: 'localhost',
      user: 'test-user'
    },
    configuration: {},
    metadata: {
      tokens: {
        github: 'missing',
        mech: 'missing',
        openai: 'available'
      },
      tags: ['test']
    }
  };
  
  const postData = JSON.stringify(sessionData);
  
  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v2/sessions/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  }, (res) => {
    console.log('Session Creation Status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Session Response:', data);
      process.exit(0);
    });
  });
  
  req.on('error', (err) => {
    console.error('Session Error:', err.message);
    process.exit(1);
  });
  
  req.write(postData);
  req.end();
};

// Run tests
if (process.argv[2] === 'session') {
  testSessionCreation();
} else {
  testHealthEndpoint();
}