# OpenAPI TypeScript Generation

This project uses OpenAPI specifications with automatic TypeScript type generation to ensure type safety between the frontend and backend.

## Quick Start

```bash
# Generate types from API schema
npm run generate-api-types

# Start development with type generation
npm run dev

# Watch API changes and auto-regenerate types (optional)
npm run watch-api-types
```

## How It Works

1. **OpenAPI Schema Definition**: API schemas are defined in `scripts/generate-api-types.js`
2. **Type Generation**: TypeScript types are generated in `libs/shared-types/src/api.ts`  
3. **Frontend Usage**: Import types from `@job-digest/shared-types/api`

## Usage Examples

### Frontend (React)
```typescript
import { components } from '@job-digest/shared-types/api';
import { apiClient } from '@/lib/api-client';

// Use generated types
type Job = components['schemas']['Job'];
type User = components['schemas']['User'];

// Types are automatically enforced
const job: Job = {
  id: 'job_123',
  title: 'Senior Developer',
  company: 'TechCorp',
  // ... TypeScript will enforce all required fields
};

// API calls are type-safe
const jobs = await apiClient.jobs.getAll(); // Returns PaginatedResponse<Job>
```

### API Client
```typescript
// In apps/web/src/lib/api-client.ts
export type Job = components['schemas']['Job'];
export type User = components['schemas']['User'];

// All API methods use generated types automatically
```

## Development Workflow

### Manual Generation
```bash
npm run generate-api-types
```

### Automatic Generation
- Types are generated automatically when running `npm run dev`
- Use `npm run watch-api-types` for continuous regeneration during API development

### When to Regenerate
- After modifying API route schemas
- After changing OpenAPI definitions
- When adding new endpoints
- Before frontend development

## File Structure

```
├── scripts/
│   ├── generate-api-types.js     # Type generation script
│   └── watch-api-types.js        # Auto-regeneration watcher
├── libs/shared-types/
│   └── src/
│       └── api.ts                # Generated TypeScript types ⚡
├── apps/web/src/lib/
│   └── api-client.ts             # API client using generated types
└── openapi.json                  # Generated OpenAPI specification
```

## Benefits

✅ **Type Safety**: Compile-time type checking between frontend and backend  
✅ **Auto-Completion**: Full IntelliSense support in IDEs  
✅ **Refactoring**: Safe renaming and restructuring across the codebase  
✅ **Documentation**: Self-documenting API with examples  
✅ **Validation**: Catch breaking changes at build time  
✅ **DX**: GraphQL-level developer experience with REST APIs  

## Schema Updates

To update the API schema:

1. Modify the schema in `scripts/generate-api-types.js`
2. Run `npm run generate-api-types`
3. Update frontend code to use new types
4. TypeScript will highlight any breaking changes

## Troubleshooting

### Import Errors
```bash
# Ensure types are generated
npm run generate-api-types

# Check TypeScript path mapping in tsconfig.json
```

### Type Mismatches
```bash
# Regenerate types after backend changes
npm run generate-api-types

# Verify schema matches backend implementation
```

### Build Issues
```bash
# Clean and regenerate
rm -rf libs/shared-types/src/api.ts openapi.json
npm run generate-api-types
```