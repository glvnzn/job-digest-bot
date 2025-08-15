#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate OpenAPI spec and TypeScript types
async function generateTypes() {
  try {
    console.log('🔧 Generating OpenAPI spec...');
    
    // Import the OpenAPI spec (requires transpiled JS)
    const { specs } = require('../dist/api/openapi.js');
    
    // Write OpenAPI spec to JSON file
    const specPath = path.join(__dirname, '../openapi.json');
    fs.writeFileSync(specPath, JSON.stringify(specs, null, 2));
    console.log('✅ OpenAPI spec generated at openapi.json');
    
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
    console.log('   - OpenAPI spec: openapi.json');
    console.log('   - TypeScript types: libs/shared-types/src/api.ts');
    console.log('');
    console.log('💡 Usage in frontend:');
    console.log("   import { components } from '@job-digest/shared-types/api'");
    console.log("   type Job = components['schemas']['Job']");
    
  } catch (error) {
    console.error('❌ Error generating API types:', error.message);
    process.exit(1);
  }
}

generateTypes();