# OpenAPI Type Generation Workflow

## Overview

This project now uses a **YAML-first approach** for OpenAPI specifications, eliminating the need for custom interface definitions.

## Files

- **`apps/api/openapi.yaml`** - Source of truth for API specification (edit this)
- **`libs/shared-types/openapi.json`** - Auto-generated JSON version (do not edit)
- **`libs/shared-types/src/api.ts`** - Auto-generated TypeScript types (do not edit)

## Workflow

1. **Edit API specification**: Modify `apps/api/openapi.yaml` with new schemas, endpoints, or parameters
2. **Generate types**: Run `npm run generate-api-types` (from project root)
3. **Use generated types**: Import from `@job-digest/shared-types/api`

## Example: Adding the `untracked` filter

### Before (Custom Interfaces)
```typescript
// Manual interface in api-client.ts
export interface JobFilters {
  search?: string;
  untracked?: boolean; // Added manually
  // ...
}
```

### After (Generated from YAML)
```yaml
# apps/api/openapi.yaml
components:
  schemas:
    JobFilters:
      type: object
      properties:
        search:
          type: string
        untracked:
          type: boolean
          description: Show only jobs not tracked by current user
```

```typescript
// Auto-generated from YAML
export type JobFilters = components['schemas']['JobFilters'];
```

## Benefits

- ✅ **Single source of truth**: YAML file in API app defines all types
- ✅ **No duplication**: Types are generated, not manually maintained
- ✅ **OpenAPI tooling**: Standard YAML format works with API documentation tools
- ✅ **Type safety**: End-to-end type safety from API spec to frontend
- ✅ **Easy editing**: YAML is human-readable and easy to modify
- ✅ **Proper organization**: API spec lives with API code

## Commands

- `npm run generate-api-types` - Convert YAML to JSON and generate TypeScript types
- `npm run watch-api-types` - Watch for changes and auto-regenerate

## Generated Type Usage

```typescript
import { components, paths } from '@job-digest/shared-types/api';

// Schema types
type Job = components['schemas']['Job'];
type JobFilters = components['schemas']['JobFilters'];

// API operation types (if needed)
type JobsGetOperation = paths['/api/v1/jobs']['get'];
```