# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Job Digest Bot is an automated job alert curation system that processes job emails from Gmail using AI, matches them against user resumes, and sends relevant opportunities via Telegram. Built as an Nx monorepo with Node.js/TypeScript, Prisma ORM for database management, and deploys to Railway.

## Development Commands

```bash
# Monorepo Development (Nx workspace)
npm run dev              # Start both API and web in parallel
npm run dev:api          # Start API development server only
npm run dev:web          # Start web development server only (port 3000)

# Building
npm run build            # Build all projects
npm run build:api        # Build API only (production deployment)
npm run build:web        # Build web app only

# Production
npm run start            # Run production API (node dist/api/main.js)
npm run start:api        # Run API via Nx serve
npm run start:web        # Run web app in production mode

# Quality & Testing
npm run lint             # Run ESLint on all projects
npm run lint:api         # Lint API only
npm run lint:web         # Lint web only
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # TypeScript check all projects
npm run type-check:api   # TypeScript check API only
npm run type-check:web   # TypeScript check web only

# Database & Schema Management (Prisma)
npm run db:generate      # Generate Prisma client from schema
npm run db:push          # Push schema changes to database (dev)
npm run db:migrate       # Create and apply migrations (production)
npm run db:migrate:deploy # Deploy migrations to production
npm run db:studio        # Open Prisma Studio (database GUI)
npm run test:prisma      # Test Prisma setup and connection

# Utilities
npm run generate-gmail-token  # Generate Gmail OAuth tokens
npm run generate-api-types    # Generate OpenAPI TypeScript types
npm run nx:graph         # View Nx dependency graph
npm run nx:reset         # Reset Nx cache
```

## Core Architecture

### Nx Monorepo Structure
The application is organized as an Nx monorepo with two main applications:

- **API** (`apps/api/`) - Node.js/TypeScript backend with service layer architecture
- **Web** (`apps/web/`) - Next.js 15 frontend (future dashboard/UI)

### Service Layer Pattern (API)
The API uses a service layer architecture with modern, type-safe services:

- **JobProcessor** (`apps/api/src/services/job-processor.ts`) - Main orchestrator coordinating all services
- **DatabaseService** (`apps/api/src/services/database.ts`) - Prisma-based ORM with full type safety
- **PrismaDatabaseService** (`apps/api/src/services/database-prisma.ts`) - Core Prisma operations and schema management
- **GmailService** - OAuth2-based Gmail API integration for email processing
- **OpenAIService** - AI-powered email classification, job extraction, and resume analysis
- **TelegramService** - Bot notifications with enhanced command handling
- **QueueService** - Background job processing with BullMQ and Redis

### Data Flow
1. Cron jobs trigger `JobProcessor.processJobAlerts()` hourly from 6 AM to 8 PM Manila time
2. Gmail service fetches unread emails from last 3 days
3. OpenAI classifies emails as job-related using batch processing
4. For each job email: extract jobs → calculate relevance scores → save to database
5. Emails are marked as read and archived (not deleted)
6. Relevant jobs (≥60% relevance) are sent via Telegram
7. Daily summaries sent at 9 PM Manila time with statistics

### Concurrency Control
Uses Prisma-managed mutex locks and BullMQ job queuing to prevent concurrent operations:
- **Job Processing Lock**: Prevents multiple email processing runs using database-based locking
- **Daily Summary Lock**: Prevents multiple summary generations
- **Queue Management**: BullMQ handles background job processing with Redis
- **Automatic Cleanup**: Expired locks are automatically cleaned up
- **Progress Notifications**: Real-time progress updates sent via Telegram during long-running operations

### Telegram Integration
- **Development**: Polling mode enabled for command handling (`/process`, `/summary`, `/status`)
- **Production**: Polling disabled (webhooks preferred on Railway)
- Commands only respond to configured `TELEGRAM_CHAT_ID` for security

## Key Configuration

### Environment Variables (Required)
```env
# Gmail API (OAuth2)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=  
GMAIL_REFRESH_TOKEN=

# AI Processing
OPENAI_API_KEY=

# Telegram Bot
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Application
NODE_ENV=development|production
PORT=3333

# API URLs (for production deployment)
API_BASE_URL=https://job-digest-bot-production.up.railway.app
NEXT_PUBLIC_API_BASE=https://job-digest-bot-production.up.railway.app
NEXT_PUBLIC_API_URL=https://job-digest-bot-production.up.railway.app

# NextAuth (for web interface)
NEXTAUTH_URL=https://your-web-app-url.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key

# Google OAuth (for web interface authentication)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

### Resume Requirement
Place `resume.pdf` in project root - used for AI-powered job relevance scoring.

### Gmail Token Generation
Use the consolidated utility: `npm run generate-gmail-token` (located at `apps/api/src/utils/gmail-token-generator.js`)

## Database Schema (Prisma)

### Current Implementation
**Prisma ORM** provides type-safe database operations with automatic schema management and migrations.

**Core Tables** (automatically created via `prisma/schema.prisma`):
- **`jobs`** - Job listings with relevance scores and processing status
- **`resume_analysis`** - Cached resume analysis (refreshed weekly)  
- **`processed_emails`** - Email processing tracking (prevents duplicates)
- **`job_locks`** - Mutex locks for concurrency control

**Multi-User Support Tables** (ready for web interface):
- **`users`** - User accounts with Google OAuth integration
- **`job_stages`** - Customizable job pipeline stages (system + user-defined)
- **`user_jobs`** - User-specific job tracking and stage assignments

### Database Operations
- **Development**: Use `npm run db:push` for schema changes
- **Production**: Use `npm run db:migrate` for versioned migrations
- **GUI Access**: Use `npm run db:studio` to open Prisma Studio
- **Type Generation**: Automatic via `npx prisma generate`

### Migration from Raw SQL (Completed)
**Legacy Implementation Removed** (August 2025):
- ❌ Raw SQL `DatabaseService` with `pg` package
- ❌ Manual connection pooling and query building
- ❌ SQL migration files and `MigrationService`
- ❌ Type-unsafe database operations

**Current Prisma Implementation**:
- ✅ **Type-Safe Operations**: All queries validated at compile time
- ✅ **Automatic Migrations**: Schema changes tracked and versioned
- ✅ **Connection Management**: Built-in pooling and reconnection logic
- ✅ **Multi-User Ready**: Schema supports user accounts and job tracking
- ✅ **Backward Compatibility**: Existing Telegram bot functionality preserved
- ✅ **Developer Experience**: Prisma Studio for database exploration

## Deployment Notes

- **Railway**: Uses railway.toml with `buildCommand = "npx nx build api"` for API-only builds
- **Build Output**: Clean bundled structure (`dist/api/main.js`) with esbuild
- **Procfile**: `web: node dist/api/main.js` points to bundled API
- **Cron Scheduling**: `node-cron` handles hourly processing and daily summaries
- **Error Handling**: All errors sent to Telegram for monitoring
- **Gmail Permissions**: Requires full Gmail scope (`https://mail.google.com/`) for archiving
- **API Rate Limits**: Uses batch processing to minimize OpenAI API calls

## Development Behavior

In development mode (`NODE_ENV=development`):
- No automatic job processing on startup
- Telegram command polling enabled
- Use `/process` command to manually trigger processing
- Use `/summary` command to generate daily summary

## Important Code Patterns

### Database Operations (Prisma)
- **Type Safety**: All database operations are fully typed with Prisma client
- **Connection Pooling**: Automatic connection management with configurable pooling
- **Query Optimization**: Prisma generates optimized SQL with relation includes/selects
- **Migration Safety**: Schema changes tracked with versioned migrations
- **Development Workflow**: Use `db:push` for rapid iteration, `db:migrate` for production

### API Architecture
- **Service Layer**: Clean separation of concerns with dependency injection
- **Error Handling**: All services include comprehensive error handling with Telegram notifications
- **Background Processing**: BullMQ handles job queues with Redis persistence
- **Progress Tracking**: Real-time progress updates for long-running operations
- **Type Safety**: End-to-end type safety from database to API responses

### AI Integration
- **Batch Processing**: OpenAI calls are batched to minimize API costs
- **Resume Analysis**: Cached analysis with weekly refresh to reduce OpenAI usage  
- **Relevance Scoring**: AI-powered job matching with configurable thresholds
- **Retry Logic**: Robust error handling with exponential backoff

### Email & Telegram
- **Unread-Only Processing**: Prevents duplicate job processing
- **Markdown Support**: Rich formatting in Telegram notifications
- **Archive Strategy**: Emails are archived (not deleted) for audit trail
- **Command Security**: Telegram commands restricted to configured chat ID

## Technology Stack

### Backend (API)
- **Runtime**: Node.js 18+ with TypeScript 5.8
- **Framework**: Express.js with structured service layer
- **Database**: PostgreSQL via Prisma ORM (type-safe queries, automatic migrations)
- **Queue**: BullMQ with Redis for background job processing
- **AI**: OpenAI GPT-4 for email classification and job relevance scoring
- **Email**: Gmail API with OAuth2 authentication
- **Notifications**: Telegram Bot API with command handling
- **Build**: Nx monorepo with esbuild bundling
- **Deployment**: Railway with automatic deployments

### Frontend (Web Interface)
- **Framework**: Next.js 15 with App Router and TypeScript
- **Styling**: Tailwind CSS 4.1 with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Authentication**: NextAuth.js with Google OAuth integration
- **API Integration**: OpenAPI TypeScript for full type safety (GraphQL-level DX)
- **Build System**: Nx workspace with optimized builds

### Database Schema & Type Safety
- **ORM**: Prisma for type-safe database operations
- **Schema**: Versioned migrations for production reliability
- **API Types**: Auto-generated OpenAPI TypeScript definitions
- **End-to-End Types**: Database → API → Frontend type safety

## Testing & Development

### API Testing
- **Manual Endpoints**: `POST /process`, `POST /daily-summary`, `GET /test-services`
- **Telegram Commands**: Interactive testing via `/process`, `/summary`, `/status`
- **Database Testing**: `npm run test:prisma` for connection and schema validation
- **Service Health**: Automatic connection tests on startup

### Development Workflow
1. **Database Changes**: Edit `prisma/schema.prisma` → `npm run db:push`
2. **API Development**: `npm run dev:api` → Test via Telegram or curl
3. **Type Generation**: `npm run generate-api-types` → Updates frontend types
4. **Web Development**: `npm run dev:web` → Full-stack development with hot reload

### Quality Assurance
- **TypeScript**: Strict mode with full coverage
- **Linting**: ESLint with Prettier formatting
- **Type Checking**: `npm run type-check` for build validation
- **Migration Safety**: Production migrations with rollback capability

## Library Preferences

**When suggesting libraries, prioritize popular, widely-used, and well-maintained options:**
- UI Components: shadcn/ui (chosen), Radix UI primitives
- State Management: TanStack Query (chosen), Zustand for client state
- Forms: React Hook Form (chosen) with Zod validation
- Styling: Tailwind CSS (chosen), CSS-in-JS alternatives
- Testing: Jest, Vitest, Playwright for e2e
- Utilities: date-fns, lodash, zod for validation
- Add to memory. The business logic, calculations and other computation should happen and provided by the api. The frontend should remain "dumb" so that changing of framwework or supporting other framework should be easy.