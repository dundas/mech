#!/usr/bin/env node

/**
 * Comprehensive Mech Services Integration Testing Framework
 * 
 * Agent 2 (Service Coordinator) - API Integration and Health Monitoring
 * 
 * This script provides comprehensive testing of all Mech services
 * including API contracts, health checks, and service dependencies.
 */

const https = require('https');
const http = require('http');

// Service Configuration
const SERVICES = {
  'mech-reader': {
    domain: 'reader.mech.is',
    port: 3001,
    expectedEndpoints: [
      { path: '/health', method: 'GET', expected: { service: 'mech-reader' } },
      { path: '/api/explain', method: 'GET', description: 'API documentation' }
    ],
    dependencies: ['mech-queue', 'mech-storage']
  },
  'mech-indexer': {
    domain: 'indexer.mech.is', 
    port: 3005,
    expectedEndpoints: [
      { path: '/health', method: 'GET', expected: { service: 'mech-indexer' } },
      { path: '/api', method: 'GET', description: 'API documentation' },
      { path: '/api/search', method: 'POST', description: 'Vector search' }
    ],
    dependencies: ['mech-storage', 'mongodb']
  },
  'mech-storage': {
    domain: 'storage.mech.is',
    port: 3007, 
    expectedEndpoints: [
      { path: '/health', method: 'GET', expected: { service: 'mech-storage' } },
      { path: '/api/explain', method: 'GET', description: 'Storage API docs' },
      { path: '/api/buckets', method: 'GET', description: 'List buckets' }
    ],
    dependencies: ['cloudflare-r2']
  },
  'mech-sequences': {
    domain: 'sequences.mech.is',
    port: 3004,
    expectedEndpoints: [
      { path: '/health', method: 'GET', expected: { service: 'mech-sequences' } },
      { path: '/api/explain', method: 'GET', description: 'Workflow API docs' }
    ],
    dependencies: ['mech-queue', 'mech-llms']
  },
  'mech-search': {
    domain: 'search.mech.is',
    port: 3009,
    expectedEndpoints: [
      { path: '/health', method: 'GET', expected: { service: 'mech-search' } },
      { path: '/api/search', method: 'POST', description: 'Multi-source search' }
    ],
    dependencies: ['serper-api', 'mech-indexer']
  },
  'mech-queue': {
    domain: 'queue.mech.is',
    port: 3002,
    expectedEndpoints: [
      { path: '/health', method: 'GET', expected: { service: 'mech-queue' } },
      { path: '/api/queues', method: 'GET', description: 'Queue status' }
    ],
    dependencies: ['redis', 'mongodb']
  },
  'mech-llms': {
    domain: 'llms.mech.is',
    port: 3008,
    expectedEndpoints: [
      { path: '/health', method: 'GET', expected: { service: 'mech-llms' } },
      { path: '/api/explain', method: 'GET', description: 'LLM API docs' },
      { path: '/api/models', method: 'GET', description: 'Available models' },
      { path: '/api/chat', method: 'POST', description: 'Chat completions' }
    ],
    dependencies: ['openai-api', 'mongodb']
  },
  'mech-memories': {
    domain: 'memories.mech.is',
    port: 3010,
    expectedEndpoints: [
      { path: '/health', method: 'GET', expected: { service: 'mech-memories' } },
      { path: '/api/memories', method: 'GET', description: 'Memory operations' },
      { path: '/api/explain', method: 'GET', description: 'Memory API docs' }
    ],
    dependencies: ['mongodb']
  }
};

// Test Configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 2,
  productionServer: '207.148.31.73',
  testMethods: {
    domain: true,    // Test HTTPS domain access
    direct: true,    // Test direct IP:port access  
    health: true,    // Test health endpoints
    api: true,       // Test API endpoints
    dependencies: false // Test service dependencies (requires auth)
  }
};

class ServiceIntegrationTester {
  constructor() {
    this.results = {
      services: {},
      summary: {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        unreachable: 0
      }
    };
  }

  async runComprehensiveTest() {
    console.log('🔍 Mech Services Integration Testing Framework');
    console.log('Agent 2: Service Coordinator - API Contract Validation\n');

    for (const [serviceName, config] of Object.entries(SERVICES)) {
      console.log(`\n📊 Testing ${serviceName}`.green.bold);
      console.log(`Domain: ${config.domain} | Port: ${config.port}`.gray);
      
      const serviceResult = await this.testService(serviceName, config);
      this.results.services[serviceName] = serviceResult;
      this.updateSummary(serviceResult);
    }

    this.printSummary();
    return this.results;
  }

  async testService(serviceName, config) {
    const result = {
      name: serviceName,
      status: 'unknown',
      domain: { accessible: false, ssl: false },
      direct: { accessible: false },
      endpoints: [],
      dependencies: config.dependencies,
      errors: [],
      responseTime: null,
      lastChecked: new Date().toISOString()
    };

    try {
      // Test 1: Domain access (HTTPS)
      if (TEST_CONFIG.testMethods.domain) {
        const domainResult = await this.testDomainAccess(config.domain);
        result.domain = domainResult;
      }

      // Test 2: Direct server access
      if (TEST_CONFIG.testMethods.direct) {
        const directResult = await this.testDirectAccess(config.port);
        result.direct = directResult;
      }

      // Test 3: Endpoint testing
      if (result.domain.accessible || result.direct.accessible) {
        for (const endpoint of config.expectedEndpoints) {
          const endpointResult = await this.testEndpoint(config, endpoint);
          result.endpoints.push(endpointResult);
        }
      }

      // Determine overall service status
      result.status = this.determineServiceStatus(result);

    } catch (error) {
      result.status = 'error';
      result.errors.push(error.message);
      console.log(`❌ ${serviceName}: ${error.message}`.red);
    }

    return result;
  }

  async testDomainAccess(domain) {
    try {
      const startTime = Date.now();
      const response = await axios.get(`https://${domain}`, {
        timeout: TEST_CONFIG.timeout,
        maxRedirects: 3,
        validateStatus: () => true // Accept any status code
      });

      const responseTime = Date.now() - startTime;
      
      return {
        accessible: true,
        ssl: true,
        statusCode: response.status,
        responseTime,
        isNginxDefault: response.data.includes('Welcome to nginx'),
        isServiceRunning: response.data.includes('mech-') || response.status === 200
      };
    } catch (error) {
      return {
        accessible: false,
        ssl: false,
        error: error.message
      };
    }
  }

  async testDirectAccess(port) {
    try {
      const startTime = Date.now();
      const response = await axios.get(`http://${TEST_CONFIG.productionServer}:${port}/health`, {
        timeout: TEST_CONFIG.timeout,
        maxRedirects: 0,
        validateStatus: () => true
      });

      const responseTime = Date.now() - startTime;

      return {
        accessible: true,
        statusCode: response.status,
        responseTime,
        healthy: response.status === 200 && response.data.status === 'healthy'
      };
    } catch (error) {
      return {
        accessible: false,
        error: error.message
      };
    }
  }

  async testEndpoint(serviceConfig, endpoint) {
    const baseUrl = serviceConfig.domain.accessible ? 
      `https://${serviceConfig.domain}` : 
      `http://${TEST_CONFIG.productionServer}:${serviceConfig.port}`;

    try {
      const response = await axios({
        method: endpoint.method,
        url: `${baseUrl}${endpoint.path}`,
        timeout: TEST_CONFIG.timeout,
        validateStatus: () => true
      });

      const isHealthy = response.status === 200;
      const hasExpectedData = endpoint.expected ? 
        this.validateExpectedData(response.data, endpoint.expected) : true;

      return {
        path: endpoint.path,
        method: endpoint.method,
        status: response.status,
        healthy: isHealthy && hasExpectedData,
        responseSize: JSON.stringify(response.data).length,
        description: endpoint.description || 'No description'
      };
    } catch (error) {
      return {
        path: endpoint.path,
        method: endpoint.method,
        error: error.message,
        healthy: false
      };
    }
  }

  validateExpectedData(responseData, expected) {
    try {
      for (const [key, value] of Object.entries(expected)) {
        if (responseData[key] !== value) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  determineServiceStatus(result) {
    if (result.errors.length > 0) return 'error';
    if (!result.domain.accessible && !result.direct.accessible) return 'unreachable';
    
    const healthyEndpoints = result.endpoints.filter(ep => ep.healthy).length;
    const totalEndpoints = result.endpoints.length;
    
    if (healthyEndpoints === totalEndpoints && totalEndpoints > 0) return 'healthy';
    if (healthyEndpoints > 0) return 'partial';
    return 'unhealthy';
  }

  updateSummary(serviceResult) {
    this.results.summary.total++;
    switch (serviceResult.status) {
      case 'healthy':
        this.results.summary.healthy++;
        break;
      case 'unreachable':
        this.results.summary.unreachable++;
        break;
      default:
        this.results.summary.unhealthy++;
    }
  }

  printSummary() {
    console.log('\n📋 Service Integration Test Summary'.yellow.bold);
    console.log('═'.repeat(50).gray);
    
    const { summary } = this.results;
    console.log(`Total Services: ${summary.total}`.white);
    console.log(`✅ Healthy: ${summary.healthy}`.green);
    console.log(`⚠️  Unhealthy: ${summary.unhealthy}`.yellow);
    console.log(`❌ Unreachable: ${summary.unreachable}`.red);

    console.log('\n🔗 Service Dependency Map:'.cyan.bold);
    console.log('mech-reader → mech-indexer → mech-storage'.gray);
    console.log('     ↓             ↓             ↓'.gray);
    console.log('mech-queue ← mech-sequences → mech-search'.gray);
    console.log('     ↓'.gray);
    console.log('mech-llms'.gray);

    // Integration Status
    console.log('\n🚨 Critical Integration Issues:'.red.bold);
    for (const [serviceName, result] of Object.entries(this.results.services)) {
      if (result.status !== 'healthy') {
        console.log(`- ${serviceName}: ${result.status}`.red);
        if (result.errors.length > 0) {
          result.errors.forEach(error => console.log(`  └─ ${error}`.gray));
        }
      }
    }

    // Recommendations
    console.log('\n💡 Service Coordinator Recommendations:'.blue.bold);
    console.log('1. Deploy service containers to production droplets'.blue);
    console.log('2. Configure nginx proxy rules for domain routing'.blue);
    console.log('3. Set up Redis for queue service connectivity'.blue);
    console.log('4. Implement health check monitoring'.blue);
    console.log('5. Configure MongoDB Atlas connections'.blue);
  }

  // Generate monitoring configuration
  generateMonitoringConfig() {
    const config = {
      services: {},
      healthCheckInterval: 30000, // 30 seconds
      alertThresholds: {
        responseTime: 5000,
        errorRate: 0.1,
        uptimeTarget: 0.995
      }
    };

    for (const [serviceName, serviceConfig] of Object.entries(SERVICES)) {
      config.services[serviceName] = {
        domain: serviceConfig.domain,
        port: serviceConfig.port,
        healthEndpoint: '/health',
        critical: ['mech-queue', 'mech-storage', 'mech-llms'].includes(serviceName),
        dependencies: serviceConfig.dependencies
      };
    }

    return config;
  }
}

// CLI Interface
async function main() {
  const tester = new ServiceIntegrationTester();
  
  if (process.argv.includes('--monitoring-config')) {
    const config = tester.generateMonitoringConfig();
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  try {
    const results = await tester.runComprehensiveTest();
    
    // Save results for other agents
    const fs = require('fs');
    const resultsFile = './service-integration-test-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    console.log(`\n💾 Results saved to: ${resultsFile}`.green);
    process.exit(results.summary.healthy === results.summary.total ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test framework error:'.red, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ServiceIntegrationTester;