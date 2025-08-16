#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate OpenAPI spec and TypeScript types
async function generateTypes() {
  try {
    console.log('🔧 Generating OpenAPI spec...');
    
    // Import the OpenAPI spec directly from TypeScript source
    const swaggerJsdoc = require('swagger-jsdoc');
    
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Job Digest API',
          version: '1.0.0',
          description: 'API for the Job Digest Bot platform',
        },
        servers: [
          {
            url: process.env.NODE_ENV === 'production' 
              ? 'https://job-digest-api.railway.app' 
              : 'http://localhost:3333',
            description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
          },
        ],
        components: {
          schemas: {
            Job: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'job_123' },
                title: { type: 'string', example: 'Senior Software Engineer' },
                company: { type: 'string', example: 'Tech Corp' },
                location: { type: 'string', example: 'San Francisco, CA', nullable: true },
                isRemote: { type: 'boolean', example: true },
                description: { type: 'string', example: 'Full-time software engineering role...', nullable: true },
                applyUrl: { type: 'string', format: 'uri', example: 'https://jobs.example.com/123' },
                salary: { type: 'string', example: '$120k - $180k', nullable: true },
                postedDate: { type: 'string', format: 'date-time', nullable: true },
                source: { type: 'string', example: 'LinkedIn' },
                relevanceScore: { type: 'number', minimum: 0, maximum: 1, example: 0.85, nullable: true },
                processed: { type: 'boolean', example: true },
                createdAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'title', 'company', 'isRemote', 'applyUrl', 'source', 'processed', 'createdAt'],
            },
            User: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                email: { type: 'string', format: 'email', example: 'user@example.com' },
                googleId: { type: 'string', example: '12345678901234567890' },
                name: { type: 'string', example: 'John Doe', nullable: true },
                avatarUrl: { type: 'string', format: 'uri', nullable: true },
                isAdmin: { type: 'boolean', example: false },
                settings: { 
                  type: 'object',
                  additionalProperties: true,
                  example: { emailNotifications: true, theme: 'light' }
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'email', 'googleId', 'isAdmin', 'settings', 'createdAt', 'updatedAt'],
            },
            JobStage: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                userId: { type: 'integer', nullable: true, example: null },
                name: { type: 'string', example: 'Interested' },
                color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#3B82F6' },
                sortOrder: { type: 'integer', example: 1 },
                isSystem: { type: 'boolean', example: true },
                createdAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'name', 'color', 'sortOrder', 'isSystem', 'createdAt'],
            },
            UserJob: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                userId: { type: 'integer', example: 1 },
                jobId: { type: 'string', example: 'job_123' },
                stageId: { type: 'integer', example: 1 },
                isTracked: { type: 'boolean', example: true },
                appliedDate: { type: 'string', format: 'date-time', nullable: true },
                interviewDate: { type: 'string', format: 'date-time', nullable: true },
                notes: { type: 'string', nullable: true, example: 'Looks promising, matches my skills' },
                applicationUrl: { type: 'string', format: 'uri', nullable: true },
                contactPerson: { type: 'string', nullable: true, example: 'Jane Smith' },
                salaryExpectation: { type: 'integer', nullable: true, example: 150000 },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'userId', 'jobId', 'stageId', 'isTracked', 'createdAt', 'updatedAt'],
            },
            ApiResponse: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'object', nullable: true },
                error: { type: 'string', nullable: true },
                message: { type: 'string', nullable: true },
              },
              required: ['success'],
            },
            PaginationMeta: {
              type: 'object',
              properties: {
                total: { type: 'integer', minimum: 0, example: 150 },
                limit: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
                offset: { type: 'integer', minimum: 0, example: 0 },
                count: { type: 'integer', minimum: 0, example: 20 },
              },
              required: ['total', 'limit', 'offset', 'count'],
            },
          },
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
      apis: ['./apps/api/src/routes/*.ts'], // Paths to files with OpenAPI annotations
    };

    const specs = swaggerJsdoc(options);
    
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