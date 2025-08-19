# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Job Digest Bot is an automated job alert curation system that processes job emails from Gmail using AI, matches them against user resumes, and sends relevant opportunities via Telegram. Built as an Nx monorepo with Node.js/TypeScript, Prisma ORM for database management, and deploys to Railway.

## Development Commands

```bash
# Monorepo Development (Nx workspace)
npm run dev              # Start both API and web in parallel (includes API type generation)
npm run dev:api          # Start API development server only
npm run dev:web          # Start web development server only (port 3000)

# Building
npm run build            # Build all projects
npm run build:api        # Build API only (production deployment)
npm run build:web        # Build web app only

# Production
npm run start            # Run all projects in production mode
npm run start:api        # Run API via Nx serve
npm run start:web        # Run web app in production mode

# Quality & Testing
npm run lint             # Run ESLint on all projects
npm run lint:api         # Lint API only
npm run lint:web         # Lint web only
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run test             # Run tests for all projects
npm run test:api         # Run API tests
npm run test:web         # Run web tests
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

# API Type Generation & Utilities
npm run generate-gmail-token  # Generate Gmail OAuth tokens
npm run generate-api-types    # Generate OpenAPI TypeScript types
npm run watch-api-types       # Watch and regenerate API types on changes
npm run nx:graph              # View Nx dependency graph
npm run nx:reset              # Reset Nx cache
```

## Core Architecture

### Nx Monorepo Structure
The application is organized as an Nx monorepo with two main applications:

- **API** (`apps/api/`) - Node.js/TypeScript backend with service layer architecture
- **Web** (`apps/web/`) - Next.js 15 frontend (future dashboard/UI)

### Service Layer Pattern (API)
The API uses a service layer architecture with modern, type-safe services:

**Core Processing Services**:
- **JobProcessor** (`apps/api/src/services/job-processor.ts`) - Main orchestrator coordinating all services
- **QueueService** (`apps/api/src/services/queue.ts`) - Background job processing with BullMQ and Redis
- **DatabaseService** (`apps/api/src/services/database.ts`) - Prisma-based ORM with full type safety
- **PrismaDatabaseService** (`apps/api/src/services/database-prisma.ts`) - Core Prisma operations and schema management

**External Integration Services**:
- **GmailService** (`apps/api/src/services/gmail.ts`) - OAuth2-based Gmail API integration for email processing
- **OpenAIService** (`apps/api/src/services/openai.ts`) - AI-powered email classification, job extraction, resume analysis, and deduplication
- **TelegramService** (`apps/api/src/services/telegram.ts`) - Bot notifications with enhanced command handling

**Analytics & Intelligence Services**:
- **MarketIntelligenceService** (`apps/api/src/services/market-intelligence.ts`) - Job market analysis and technology trend tracking
- **InsightAutomationService** (`apps/api/src/services/insight-automation.ts`) - Automated daily insights and market snapshot generation
- **InsightsService** (`apps/api/src/services/insights.ts`) - User-specific career insights and recommendations

### Data Flow
1. Cron jobs trigger `JobProcessor.processJobAlerts()` hourly from 6 AM to 8 PM Manila time
2. Gmail service fetches unread emails from last 3 days
3. OpenAI classifies emails as job-related using batch processing
4. For each job email: extract jobs → **deduplication check** → calculate relevance scores → save to database
5. Emails are marked as read and archived (not deleted)
6. Relevant jobs (≥60% relevance) are sent via Telegram
7. Daily summaries sent at 9 PM Manila time with statistics

### Job Deduplication System (Anti-Duplicate)
**Comprehensive deduplication strategies prevent saving duplicate jobs:**

**Primary Strategy - Deterministic Job IDs** (`apps/api/src/services/openai.ts`):
- **URL-Based Hashing**: Jobs with valid URLs get deterministic IDs based on normalized URL
- **Content-Based Hashing**: Jobs without URLs use title + company combination hash
- **URL Normalization**: Removes tracking parameters and standardizes URLs for consistent matching
- **SHA-256 Implementation**: Ensures collision-resistant unique identifiers

**Secondary Strategy - Database-Level Checks** (`apps/api/src/services/database-prisma.ts`):
- **Exact ID Matching**: `jobExists()` method prevents duplicate IDs
- **Content Similarity**: `findSimilarJobs()` catches variations in job postings
- **Fuzzy Matching**: Case-insensitive title and company matching
- **URL Validation**: Identifies jobs with same apply URLs but different content

**Processing Pipeline Integration** (`apps/api/src/services/job-processor.ts`):
- **Early Detection**: Deduplication happens before relevance calculation
- **Performance Optimization**: Skips AI processing for known duplicates
- **Comprehensive Logging**: Clear reporting of new vs duplicate jobs
- **Statistics Tracking**: Reports show "X new, Y duplicates, Z sent"

**Benefits**:
- ✅ **Zero Duplicate Storage**: Same job never saved twice
- ✅ **Cost Optimization**: Prevents unnecessary OpenAI API calls
- ✅ **Performance**: Early exit for duplicates saves processing time
- ✅ **Data Integrity**: Consistent job identification across emails
- ✅ **Analytics**: Clear visibility into duplicate vs new job rates

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

**API Configuration**:
```env
# Gmail API (OAuth2 for email processing)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# OpenAI API (for job classification and resume analysis)
OPENAI_API_KEY=your_openai_api_key

# Telegram Bot (for notifications and commands)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Database (PostgreSQL via Prisma)
DATABASE_URL=postgresql://username:password@hostname:port/database

# Queue & Redis (for background job processing)
REDIS_URL=redis://localhost:6379

# Application Configuration
NODE_ENV=development|production
PORT=3333

# Authentication & Security
JWT_SECRET=your-jwt-secret-key
DISABLE_AUTH=false
ADMIN_EMAIL=admin@yourcompany.com
```

**Web Application Configuration**:
```env
# API Connection (for frontend to connect to API)
NEXT_PUBLIC_API_URL=https://job-digest-bot-production.up.railway.app

# NextAuth Configuration (authentication)
NEXTAUTH_URL=https://your-web-app-url.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key

# Google OAuth (for web app user authentication)
GOOGLE_CLIENT_ID=your_web_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_web_google_oauth_client_secret
```

**Development Setup**:
```env
# For local development, create .env.local with:
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-key
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

## Database Structure Reference

### Core Tables (Bot Functionality)

#### `jobs` - Job Listings
**Purpose**: Stores all extracted job listings with AI relevance scoring
```sql
id               String    PK  -- Deterministic hash-based ID (deduplication)
title            String        -- Job title
company          String        -- Company name
location         String?       -- Job location (nullable)
is_remote        Boolean       -- Remote work availability (default: false)
description      String?       -- Job description (nullable)
requirements     String[]      -- Array of skill requirements
apply_url        String        -- Application URL
salary           String?       -- Salary information (nullable)
posted_date      DateTime?     -- When job was posted (nullable)
source           String        -- Platform (LinkedIn, Indeed, etc.)
relevance_score  Float?        -- AI-calculated relevance (0.0-1.0)
email_message_id String        -- Gmail message ID reference
processed        Boolean       -- Notification sent flag (default: false)
created_at       DateTime      -- When extracted (default: now())
```

#### `resume_analysis` - AI Resume Analysis Cache
**Purpose**: Stores parsed resume data for job matching (refreshed weekly)
```sql
id              Int       PK SERIAL  -- Auto-increment ID
skills          String[]              -- Extracted skills array
experience      String[]              -- Experience descriptions
preferred_roles String[]              -- Preferred job titles
seniority       String?               -- Experience level (nullable)
analyzed_at     DateTime              -- Analysis timestamp (default: now())
```

#### `processed_emails` - Email Processing Tracker
**Purpose**: Prevents duplicate email processing and tracks extraction stats
```sql
message_id      String    PK  -- Gmail message ID (unique)
subject         String?       -- Email subject (nullable)
from_email      String?       -- Sender email (nullable)
processed_at    DateTime      -- Processing timestamp (default: now())
jobs_extracted  Int           -- Number of jobs found (default: 0)
deleted         Boolean       -- Archived in Gmail flag (default: false)
```

#### `job_locks` - Concurrency Control
**Purpose**: Prevents multiple simultaneous job processing runs
```sql
lock_name   String    PK  -- Lock identifier
locked_at   DateTime      -- Lock creation time (default: now())
locked_by   String        -- Process/user identifier (default: "system")
expires_at  DateTime      -- Lock expiration time
```

### Multi-User Tables (Web Interface)

#### `users` - User Accounts
**Purpose**: Google OAuth user management with admin privileges
```sql
id         Int       PK SERIAL  -- Auto-increment ID
email      String    UNIQUE     -- Google account email
google_id  String    UNIQUE     -- Google OAuth ID
name       String?              -- Display name (nullable)
avatar_url String?              -- Profile picture URL (nullable)
is_admin   Boolean              -- Admin privileges (default: false)
settings   Json                 -- User preferences (default: {})
created_at DateTime             -- Account creation (default: now())
updated_at DateTime             -- Last modification (auto-update)
```

#### `job_stages` - Kanban Pipeline Stages
**Purpose**: Customizable job application stages (system + user-defined)
```sql
id         Int       PK SERIAL  -- Auto-increment ID
user_id    Int?      FK         -- NULL for system stages
name       String               -- Stage name
color      String               -- Hex color (default: "#3B82F6")
sort_order Int                  -- Display order
is_system  Boolean              -- System-defined flag (default: false)
created_at DateTime             -- Creation time (default: now())

-- Constraints:
UNIQUE(name, is_system)  -- Unique system stage names
```

**Default System Stages**:
- Interested (#3B82F6) → Applied (#F59E0B) → Phone Screen (#8B5CF6) → Technical Interview (#06B6D4) → Final Round (#10B981) → Offer Received (#22C55E) → Accepted (#16A34A) → Rejected (#EF4444) → Not Interested (#6B7280)

#### `user_jobs` - Job Tracking
**Purpose**: User-specific job application tracking with detailed metadata
```sql
id                 Int       PK SERIAL  -- Auto-increment ID
user_id            Int       FK         -- User reference
job_id             String    FK         -- Job reference
stage_id           Int       FK         -- Current pipeline stage
is_tracked         Boolean              -- Active tracking (default: true)
applied_date       DateTime?            -- Application date (nullable)
interview_date     DateTime?            -- Interview date (nullable)
notes              String?              -- User notes (nullable)
application_url    String?              -- Custom application URL (nullable)
contact_person     String?              -- Recruiter/contact (nullable)
salary_expectation Int?                 -- Expected salary (nullable)
created_at         DateTime             -- Tracking start (default: now())
updated_at         DateTime             -- Last update (auto-update)

-- Constraints:
UNIQUE(user_id, job_id)  -- One entry per user per job
```

### Market Intelligence Tables

#### `tech_trends` - Technology Tracking
**Purpose**: Monitors technology demand and growth across job market
```sql
id          Int       PK SERIAL  -- Auto-increment ID
technology  String    UNIQUE     -- Technology name (React, Python, etc.)
category    String               -- Category (Frontend, Backend, DevOps, etc.)
description String?              -- Technology description (nullable)
created_at  DateTime             -- First detection (default: now())
updated_at  DateTime             -- Last update (auto-update)
```

#### `tech_trend_weekly` - Weekly Analytics
**Purpose**: Time-series data for technology trends and growth analysis
```sql
id           Int       PK SERIAL  -- Auto-increment ID
trend_id     Int       FK         -- TechTrend reference
week_start   DateTime             -- Monday of the week
mentions     Int                  -- Total mentions (default: 0)
job_count    Int                  -- Jobs requiring this tech (default: 0)
percentage   Float                -- Market percentage (default: 0)
avg_salary   Int?                 -- Average salary (nullable)
growth_rate  Float                -- Week-over-week growth (default: 0)
trend_status String               -- rising|falling|stable|emerging (default: "stable")
created_at   DateTime             -- Analysis time (default: now())

-- Constraints:
UNIQUE(trend_id, week_start)  -- One entry per tech per week
```

#### `job_insights` - AI Job Analysis
**Purpose**: Detailed AI analysis of job requirements and market context
```sql
id                 Int       PK SERIAL  -- Auto-increment ID
job_id             String    UNIQUE FK  -- Job reference
technologies       Json                 -- Detected tech with confidence scores
skill_requirements Json                 -- Parsed skill requirements
experience_level   String?              -- junior|mid|senior|lead (nullable)
salary_range       Json?                -- {min, max, currency} (nullable)
key_skills         Json                 -- Top required skills
nice_to_have       Json                 -- Optional skills
responsibilities   Json                 -- Key responsibilities
benefits           Json?                -- Parsed benefits (nullable)
competitiveness    Float                -- Market competition score (default: 0)
rarity_score       Float                -- Skill rarity score (default: 0)
created_at         DateTime             -- Analysis time (default: now())
updated_at         DateTime             -- Last update (auto-update)
```

#### `market_snapshots` - Market Overview
**Purpose**: Daily market analysis and trend summaries
```sql
id               Int       PK SERIAL  -- Auto-increment ID
snapshot_date    DateTime  UNIQUE     -- Analysis date
total_jobs       Int                  -- Total jobs analyzed
avg_salary_range Json                 -- Market salary data
top_technologies Json                 -- Most demanded technologies
emerging_skills  Json                 -- New/growing skills
market_trends    Json                 -- Trend analysis
salary_trends    Json                 -- Salary movement
skill_demand     Json                 -- Skill demand metrics
recommendations  Json?                -- Global recommendations (nullable)
created_at       DateTime             -- Snapshot time (default: now())
```

#### `user_insights` - Personal Analytics
**Purpose**: User-specific career insights and recommendations
```sql
id               Int       PK SERIAL  -- Auto-increment ID
user_id          Int       FK         -- User reference
current_skills   Json                 -- Skills from tracked jobs
skill_gaps       Json                 -- Missing market skills
recommendations  Json                 -- Personalized suggestions
learning_path    Json                 -- Suggested learning roadmap
achievements     Json?                -- Completed milestones (nullable)
goals            Json?                -- Learning goals (nullable)
market_position  Json                 -- Market competitiveness analysis
competitiveness  Float                -- User market score (default: 0)
version          Int                  -- Insight version (default: 1)
is_active        Boolean              -- Current version flag (default: true)
created_at       DateTime             -- Analysis time (default: now())
updated_at       DateTime             -- Last update (auto-update)

-- Constraints:
UNIQUE(user_id, version)  -- Versioned insights per user
```

### Relationships & Foreign Keys

```
users (1) ←→ (N) job_stages    -- Custom stages per user
users (1) ←→ (N) user_jobs     -- Job tracking per user
users (1) ←→ (N) user_insights -- Personal analytics

jobs (1) ←→ (N) user_jobs      -- Multiple users can track same job
jobs (1) ←→ (1) job_insights   -- One analysis per job

job_stages (1) ←→ (N) user_jobs -- Jobs in pipeline stages

tech_trends (1) ←→ (N) tech_trend_weekly -- Historical data per technology
```

### Indexes & Performance

**Automatic Indexes** (created by Prisma):
- All Primary Keys and UNIQUE constraints
- All Foreign Key columns
- `jobs.relevance_score + jobs.created_at` (composite query optimization)

**Query Patterns**:
- Job relevance filtering: `WHERE relevance_score >= ? ORDER BY relevance_score DESC`
- User job tracking: `WHERE user_id = ? AND is_tracked = true`
- Daily summaries: `WHERE created_at >= ? AND created_at < ?`
- Technology trends: `WHERE week_start >= ? ORDER BY growth_rate DESC`

## Deployment Notes

### Railway (API Deployment)
- **Build Command**: `npx nx build api` (configured in railway.toml)
- **Build Output**: Clean bundled structure (`dist/api/main.js`) with esbuild
- **Start Command**: `node dist/api/main.js`
- **Environment**: Requires all API environment variables listed above
- **Redis**: Built-in Redis addon for BullMQ queue processing
- **PostgreSQL**: Railway database with automatic backups

### Production Features
- **Background Processing**: BullMQ with Redis for job queues
- **Cron Scheduling**: `node-cron` handles hourly processing (6 AM-8 PM Manila) and daily summaries (9 PM)
- **Error Monitoring**: All errors sent to Telegram for real-time monitoring
- **Progress Tracking**: Real-time progress updates during long-running operations
- **Job Deduplication**: Prevents duplicate job processing across multiple runs
- **Market Intelligence**: Automated daily analytics and trend analysis

### API Rate Management
- **OpenAI Optimization**: Batch processing to minimize API calls
- **Gmail Rate Limits**: Respectful email fetching with built-in delays
- **Job URL Fetching**: 1-second delays between job site requests
- **Deduplication**: Skips AI processing for known duplicate jobs

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
- **Deduplication Methods**: `jobExists()` for ID checks, `findSimilarJobs()` for content matching
- **Upsert Strategy**: Database handles duplicate IDs gracefully with update-or-create logic

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
- **Deduplication Optimization**: AI relevance calculation skipped for duplicate jobs
- **Deterministic Job IDs**: Content-based hashing prevents timestamp-based duplicates

### Email & Telegram
- **Unread-Only Processing**: Prevents duplicate job processing
- **Markdown Support**: Rich formatting in Telegram notifications
- **Archive Strategy**: Emails are archived (not deleted) for audit trail
- **Command Security**: Telegram commands restricted to configured chat ID

## Technology Stack

### Backend (API)
- **Runtime**: Node.js 18+ with TypeScript 5.8
- **Framework**: Express.js with structured service layer architecture
- **Database**: PostgreSQL via Prisma ORM (type-safe queries, automatic migrations, full schema management)
- **Queue**: BullMQ with Redis for background job processing and queue management
- **AI**: OpenAI GPT-4o-mini for email classification, job extraction, relevance scoring, and market analysis
- **Email**: Gmail API with OAuth2 authentication and respectful rate limiting
- **Notifications**: Telegram Bot API with enhanced command handling and progress tracking
- **Authentication**: JWT-based API authentication with admin role management
- **Analytics**: Market intelligence service with technology trend tracking
- **Deduplication**: SHA-256 content-based job ID generation for duplicate prevention
- **Build**: Nx monorepo with esbuild bundling and optimized production builds
- **Deployment**: Railway with Redis addon, PostgreSQL, and automatic deployments

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
- **Manual Endpoints**: 
  - `POST /process` - Trigger job processing manually
  - `POST /daily-summary` - Generate daily summary
  - `GET /test-services` - Health check for all external services
  - `GET /api/jobs` - List jobs with filtering and pagination
  - `GET /api/insights/market` - Market intelligence data
- **Telegram Commands**: Interactive testing via `/process`, `/summary`, `/status`
- **Database Testing**: `npm run test:prisma` for connection and schema validation
- **Queue Monitoring**: BullMQ dashboard for job queue status
- **Service Health**: Automatic connection tests on startup with comprehensive error reporting

### Development Workflow
1. **Database Changes**: Edit `prisma/schema.prisma` → `npm run db:push` → `npm run db:generate`
2. **API Development**: `npm run dev:api` → Test via Telegram commands or API endpoints
3. **Type Generation**: `npm run generate-api-types` → Auto-updates frontend types
4. **Web Development**: `npm run dev:web` → Full-stack development with hot reload
5. **Queue Debugging**: Monitor BullMQ dashboard for background job processing
6. **Market Intelligence**: Use `/insights` endpoints to test analytics features

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
- **Architecture Principle**: Business logic, calculations, and computations happen in the API. The frontend remains "thin" for easy framework switching and multi-client support.
- **Development Tip**: Check other terminals for running `npm run dev` processes before starting new ones to avoid port conflicts.

## Current System Status (August 2025)

### ✅ Recently Implemented Features
- **Job Deduplication System**: Comprehensive duplicate prevention with deterministic IDs and content matching
- **Market Intelligence**: Automated technology trend tracking and analytics
- **Enhanced Progress Tracking**: Real-time updates during long-running operations
- **Background Queue Processing**: BullMQ implementation for scalable job processing
- **Multi-User Database Schema**: Ready for web interface with user management and job tracking
- **API Type Generation**: Automated OpenAPI TypeScript generation for frontend integration

### ⚠️ Development Notes
- **Database Migration**: Successfully migrated from raw SQL to Prisma ORM (August 2025)
- **Legacy Code Removed**: Old database service implementations deprecated
- **Type Safety**: End-to-end TypeScript coverage from database to frontend
- **Production Ready**: Comprehensive error handling, monitoring, and deployment automation

### 🚀 Next Development Priorities
1. **Web Interface Completion**: Frontend implementation for job tracking and analytics
2. **User Authentication**: Google OAuth integration for multi-user support
3. **Advanced Analytics**: Enhanced market intelligence and personal insights
4. **API Documentation**: OpenAPI specification completion for public API
5. **Testing Infrastructure**: Comprehensive test suite implementation