#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate OpenAPI spec and TypeScript types
async function generateTypes() {
  try {
    console.log('🔧 Loading OpenAPI spec from YAML...');
    
    // Load and convert YAML to JSON
    const yaml = require('js-yaml');
    const yamlPath = path.join(__dirname, '../apps/api/openapi.yaml');
    
    if (!fs.existsSync(yamlPath)) {
      throw new Error('apps/api/openapi.yaml not found. Please create it first.');
    }
    
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const specs = yaml.load(yamlContent);
    
    // Override server URL if environment variables are set
    if (process.env.API_BASE_URL) {
      specs.servers = [{
        url: process.env.API_BASE_URL,
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      }];
    }
    
    // Write OpenAPI spec to JSON file (for tooling compatibility)
    const specPath = path.join(__dirname, '../libs/shared-types/openapi.json');
    
    // Ensure directory exists
    const specDir = path.dirname(specPath);
    if (!fs.existsSync(specDir)) {
      fs.mkdirSync(specDir, { recursive: true });
    }
    
    fs.writeFileSync(specPath, JSON.stringify(specs, null, 2));
    console.log('✅ OpenAPI spec loaded and converted to JSON');
    
    // Generate TypeScript types using openapi-typescript
    const { execSync } = require('child_process');
    const typesPath = path.join(__dirname, '../libs/shared-types/src/api.ts');
    
    // Ensure directory exists
    const typesDir = path.dirname(typesPath);
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }
    
    console.log('🔧 Generating TypeScript types...');
    execSync(`npx openapi-typescript ${specPath} --output ${typesPath}`, { 
      stdio: 'inherit' 
    });
    
    console.log('✅ TypeScript types generated at libs/shared-types/src/api.ts');
    console.log('');
    console.log('🎉 API type generation complete!');
    console.log('   - OpenAPI source: apps/api/openapi.yaml');
    console.log('   - OpenAPI spec: libs/shared-types/openapi.json (auto-generated)');
    console.log('   - TypeScript types: libs/shared-types/src/api.ts (auto-generated)');
    console.log('');
    console.log('💡 Usage in frontend:');
    console.log("   import { components } from '@job-digest/shared-types/api'");
    console.log("   type Job = components['schemas']['Job']");
    console.log('');
    console.log('✏️  To modify the API spec, edit apps/api/openapi.yaml and run this command again');
    
  } catch (error) {
    console.error('❌ Error generating API types:', error.message);
    process.exit(1);
  }
}

generateTypes();