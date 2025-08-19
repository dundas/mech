#!/usr/bin/env node

// Generalized Mech Service Deployer
// Deploy any mech service to DigitalOcean using mech-containers orchestration

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface ServiceConfig {
  name: string;
  version: string;
  description: string;
  registry: {
    image: string;
    tag?: string;
  };
  runtime: {
    port: number;
    healthCheck: string;
    environment: Record<string, string>;
    resources?: {
      cpu?: string;
      memory?: string;
      size?: string;
    };
  };
  deployment: {
    provider: 'digitalocean' | 'docker' | 'aws';
    region?: string;
    replicas?: number;
    tags?: string[];
  };
  dependencies?: {
    services?: string[];
    databases?: string[];
    external?: string[];
  };
  monitoring?: {
    enabled: boolean;
    endpoints?: string[];
  };
}

interface DeploymentTemplate {
  userDataScript: string;
  containerConfig: any;
  testCommands: string[];
}

class GeneralizedServiceDeployer {
  private containersServiceUrl: string;
  private serviceConfigsPath: string;
  
  constructor(
    containersServiceUrl = 'http://localhost:3012',
    serviceConfigsPath = './service-configs'
  ) {
    this.containersServiceUrl = containersServiceUrl;
    this.serviceConfigsPath = serviceConfigsPath;
  }

  async deployService(serviceName: string, environment = 'production'): Promise<any> {
    console.log(`🚀 Deploying ${serviceName} to ${environment}...`);
    
    try {
      // Step 1: Load service configuration
      const config = await this.loadServiceConfig(serviceName, environment);
      console.log(`📋 Loaded configuration for ${config.name}`);
      
      // Step 2: Validate configuration
      this.validateConfig(config);
      
      // Step 3: Check dependencies
      await this.checkDependencies(config);
      
      // Step 4: Generate deployment template
      const template = this.generateDeploymentTemplate(config);
      
      // Step 5: Deploy through mech-containers
      const result = await this.deployThroughContainers(config, template);
      
      // Step 6: Run post-deployment tests
      await this.runPostDeploymentTests(result, config);
      
      // Step 7: Register service (optional)
      await this.registerService(result, config);
      
      return result;
      
    } catch (error: any) {
      console.error(`❌ Deployment of ${serviceName} failed:`, error.message);
      throw error;
    }
  }

  private async loadServiceConfig(serviceName: string, environment: string): Promise<ServiceConfig> {
    const configPaths = [
      path.join(this.serviceConfigsPath, `${serviceName}.yaml`),
      path.join(this.serviceConfigsPath, `${serviceName}.yml`),
      path.join(serviceName, 'deploy.yaml'),
      path.join(serviceName, 'deploy.yml'),
      path.join(serviceName, '.mech', 'service.yaml'),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(configContent) as ServiceConfig;
        
        // Override with environment-specific values
        const envConfigPath = configPath.replace(/\.ya?ml$/, `.${environment}.yaml`);
        if (fs.existsSync(envConfigPath)) {
          const envConfig = yaml.load(fs.readFileSync(envConfigPath, 'utf8')) as Partial<ServiceConfig>;
          return this.mergeConfigs(config, envConfig);
        }
        
        return config;
      }
    }
    
    throw new Error(`Service configuration not found for ${serviceName}`);
  }

  private mergeConfigs(base: ServiceConfig, override: Partial<ServiceConfig>): ServiceConfig {
    return {
      ...base,
      runtime: { ...base.runtime, ...override.runtime },
      deployment: { ...base.deployment, ...override.deployment },
      dependencies: { ...base.dependencies, ...override.dependencies },
      monitoring: { ...base.monitoring, ...override.monitoring },
    };
  }

  private validateConfig(config: ServiceConfig): void {
    const required = ['name', 'registry.image', 'runtime.port', 'runtime.healthCheck'];
    
    for (const field of required) {
      const keys = field.split('.');
      let value: any = config;
      
      for (const key of keys) {
        value = value?.[key];
      }
      
      if (!value) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
  }

  private async checkDependencies(config: ServiceConfig): Promise<void> {
    if (!config.dependencies) return;
    
    // Check dependent services
    if (config.dependencies.services) {
      for (const service of config.dependencies.services) {
        try {
          await axios.get(`http://${service}/health`, { timeout: 5000 });
          console.log(`✅ Dependency ${service} is available`);
        } catch (error) {
          console.log(`⚠️ Dependency ${service} is not available`);
        }
      }
    }
    
    // Check databases
    if (config.dependencies.databases) {
      console.log(`📊 Database dependencies: ${config.dependencies.databases.join(', ')}`);
    }
  }

  private generateDeploymentTemplate(config: ServiceConfig): DeploymentTemplate {
    const imageTag = config.registry.tag || 'latest';
    const fullImage = `${config.registry.image}:${imageTag}`;
    
    // Generate environment variables
    const envVars = Object.entries(config.runtime.environment)
      .map(([key, value]) => `export ${key}="${value}"`)
      .join('\n');
    
    const envFile = Object.entries(config.runtime.environment)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const userDataScript = `#!/bin/bash
set -e

echo "🚀 Starting deployment of ${config.name}..."

# Update system
apt-get update
apt-get install -y docker.io jq curl

# Start Docker
systemctl start docker
systemctl enable docker

# Set environment variables
${envVars}

# Create service directory
mkdir -p /opt/${config.name}
cd /opt/${config.name}

# Create environment file
cat > .env << 'EOF'
${envFile}
EOF

# Pull the service image
echo "📦 Pulling ${config.name} image..."
docker pull ${fullImage}

# Run the service
echo "🎯 Starting ${config.name} service..."
docker run -d \\
  --name ${config.name} \\
  --restart unless-stopped \\
  -p ${config.runtime.port}:${config.runtime.port} \\
  --env-file .env \\
  ${config.deployment.tags?.map(tag => `--label "${tag}"`).join(' \\') || ''} \\
  ${fullImage}

# Wait for service to be ready
echo "⏳ Waiting for service to start..."
sleep 20

# Health check
echo "🏥 Running health check..."
for i in {1..12}; do
  if curl -f http://localhost:${config.runtime.port}${config.runtime.healthCheck} > /dev/null 2>&1; then
    echo "✅ ${config.name} is healthy!"
    break
  fi
  echo "Attempt $i/12: Service not ready, waiting..."
  sleep 10
done

echo "✅ ${config.name} deployed successfully!"
`;

    const containerConfig = {
      name: `${config.name}-${Date.now()}`,
      provider: config.deployment.provider,
      region: config.deployment.region || 'nyc1',
      size: config.runtime.resources?.size || 's-2vcpu-2gb',
      userData: Buffer.from(userDataScript).toString('base64'),
      tags: [...(config.deployment.tags || []), 'mech', config.name, 'production'],
      purpose: 'DEDICATED_SERVICE'
    };

    const testCommands = [
      `curl http://HOST:${config.runtime.port}${config.runtime.healthCheck}`,
      ...(config.monitoring?.endpoints?.map(endpoint => 
        `curl http://HOST:${config.runtime.port}${endpoint}`
      ) || [])
    ];

    return { userDataScript, containerConfig, testCommands };
  }

  private async deployThroughContainers(config: ServiceConfig, template: DeploymentTemplate): Promise<any> {
    // Check containers service
    await this.checkContainersService();
    
    // Provision container
    console.log('📦 Provisioning container...');
    const provisionResponse = await axios.post(
      `${this.containersServiceUrl}/api/containers/provision`,
      template.containerConfig
    );
    
    const containerId = provisionResponse.data.containerId;
    console.log(`✅ Container provisioned: ${containerId}`);
    
    // Wait for ready
    console.log('⏳ Waiting for container to be ready...');
    const containerInfo = await this.waitForContainerReady(containerId);
    
    return {
      containerId,
      host: containerInfo.host,
      port: config.runtime.port,
      serviceUrl: `http://${containerInfo.host}:${config.runtime.port}`,
      config
    };
  }

  private async runPostDeploymentTests(result: any, config: ServiceConfig): Promise<void> {
    console.log('🧪 Running post-deployment tests...');
    
    const baseUrl = `http://${result.host}:${result.port}`;
    
    // Health check
    try {
      await axios.get(`${baseUrl}${config.runtime.healthCheck}`, { timeout: 10000 });
      console.log('✅ Health check passed');
    } catch (error) {
      console.log('⚠️ Health check failed');
    }
    
    // Additional monitoring endpoints
    if (config.monitoring?.endpoints) {
      for (const endpoint of config.monitoring.endpoints) {
        try {
          await axios.get(`${baseUrl}${endpoint}`, { timeout: 5000 });
          console.log(`✅ ${endpoint} endpoint accessible`);
        } catch (error) {
          console.log(`⚠️ ${endpoint} endpoint failed`);
        }
      }
    }
  }

  private async registerService(result: any, config: ServiceConfig): Promise<void> {
    // Optional: Register service in service discovery
    // This could integrate with Consul, etcd, or a custom service registry
    console.log(`📝 Service ${config.name} registered at ${result.serviceUrl}`);
  }

  private async checkContainersService(): Promise<void> {
    try {
      await axios.get(`${this.containersServiceUrl}/health`);
      console.log('✅ Mech-containers service is available');
    } catch (error) {
      throw new Error(`Mech-containers service not available at ${this.containersServiceUrl}`);
    }
  }

  private async waitForContainerReady(containerId: string, timeout = 600000): Promise<any> {
    const startTime = Date.now();
    const checkInterval = 15000;
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(`${this.containersServiceUrl}/api/containers/${containerId}`);
        const container = response.data;
        
        if (container.status === 'RUNNING' && container.host) {
          return container;
        }
        
        console.log(`⏳ Container status: ${container.status}`);
      } catch (error) {
        console.log('⏳ Waiting for container info...');
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`Container ${containerId} did not become ready within ${timeout}ms`);
  }

  // Utility methods
  async listDeployments(): Promise<any[]> {
    const response = await axios.get(`${this.containersServiceUrl}/api/containers`);
    return response.data.filter((container: any) => 
      container.tags?.includes('mech') && container.purpose === 'DEDICATED_SERVICE'
    );
  }

  async terminateService(serviceName: string): Promise<void> {
    const deployments = await this.listDeployments();
    const serviceDeployments = deployments.filter(d => d.tags?.includes(serviceName));
    
    for (const deployment of serviceDeployments) {
      await axios.delete(`${this.containersServiceUrl}/api/containers/${deployment.containerId}`);
      console.log(`🗑️ Terminated ${serviceName} container: ${deployment.containerId}`);
    }
  }

  async scaleService(serviceName: string, replicas: number): Promise<void> {
    const currentDeployments = await this.listDeployments();
    const serviceDeployments = currentDeployments.filter(d => d.tags?.includes(serviceName));
    
    if (serviceDeployments.length < replicas) {
      // Scale up
      const needed = replicas - serviceDeployments.length;
      for (let i = 0; i < needed; i++) {
        await this.deployService(serviceName);
      }
    } else if (serviceDeployments.length > replicas) {
      // Scale down
      const excess = serviceDeployments.length - replicas;
      for (let i = 0; i < excess; i++) {
        await axios.delete(`${this.containersServiceUrl}/api/containers/${serviceDeployments[i].containerId}`);
      }
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const serviceName = args[1];
  const environment = args[2] || 'production';
  
  const deployer = new GeneralizedServiceDeployer();
  
  try {
    switch (command) {
      case 'deploy':
        if (!serviceName) {
          console.error('Usage: deploy <service-name> [environment]');
          process.exit(1);
        }
        const result = await deployer.deployService(serviceName, environment);
        console.log('\n🎉 Deployment Complete!');
        console.log(`Service URL: ${result.serviceUrl}`);
        console.log(`Container ID: ${result.containerId}`);
        break;
        
      case 'list':
        const deployments = await deployer.listDeployments();
        console.log('\n📋 Active Deployments:');
        deployments.forEach(d => {
          console.log(`• ${d.name} (${d.containerId}) - ${d.host}:${d.ports?.[0]}`);
        });
        break;
        
      case 'terminate':
        if (!serviceName) {
          console.error('Usage: terminate <service-name>');
          process.exit(1);
        }
        await deployer.terminateService(serviceName);
        break;
        
      case 'scale':
        const replicas = parseInt(args[2]);
        if (!serviceName || !replicas) {
          console.error('Usage: scale <service-name> <replicas>');
          process.exit(1);
        }
        await deployer.scaleService(serviceName, replicas);
        break;
        
      default:
        console.log('Usage: generalized-service-deployer <command> [args]');
        console.log('Commands:');
        console.log('  deploy <service> [env]  - Deploy a service');
        console.log('  list                    - List active deployments');
        console.log('  terminate <service>     - Terminate service deployments');
        console.log('  scale <service> <n>     - Scale service to n replicas');
    }
  } catch (error) {
    console.error('💥 Command failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { GeneralizedServiceDeployer, ServiceConfig };