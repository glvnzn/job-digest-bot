# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Job Digest Bot is an automated job alert curation system that processes job emails from Gmail using AI, matches them against user resumes, and sends relevant opportunities via Telegram. Built as an Nx monorepo with Node.js/TypeScript, PostgreSQL storage, and deploys to Railway.

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

# Utilities
npm run generate-gmail-token  # Generate Gmail OAuth tokens
npm run nx:graph         # View Nx dependency graph
npm run nx:reset         # Reset Nx cache
```

## Core Architecture

### Nx Monorepo Structure
The application is organized as an Nx monorepo with two main applications:

- **API** (`apps/api/`) - Node.js/TypeScript backend with service layer architecture
- **Web** (`apps/web/`) - Next.js 15 frontend (future dashboard/UI)

### Service Layer Pattern (API)
The API uses a service layer architecture with five main services:

- **JobProcessor** (`apps/api/src/services/job-processor.ts`) - Main orchestrator
- **GmailService** - OAuth2-based Gmail API integration
- **OpenAIService** - AI-powered email classification and job extraction
- **TelegramService** - Bot notifications with enhanced /help command
- **DatabaseService** - PostgreSQL operations with connection pooling

### Data Flow
1. Cron jobs trigger `JobProcessor.processJobAlerts()` hourly from 6 AM to 8 PM Manila time
2. Gmail service fetches unread emails from last 3 days
3. OpenAI classifies emails as job-related using batch processing
4. For each job email: extract jobs → calculate relevance scores → save to database
5. Emails are marked as read and archived (not deleted)
6. Relevant jobs (≥60% relevance) are sent via Telegram
7. Daily summaries sent at 9 PM Manila time with statistics

### Concurrency Control
Uses PostgreSQL-based mutex locks to prevent concurrent job processing:
- `job_processing` lock: Prevents multiple email processing runs
- `daily_summary` lock: Prevents multiple summary generations
- Automatic cleanup of expired locks
- Clear user notifications when processes are already running

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
```

### Resume Requirement
Place `resume.pdf` in project root - used for AI-powered job relevance scoring.

### Gmail Token Generation
Use the consolidated utility: `npm run generate-gmail-token` (located at `apps/api/src/utils/gmail-token-generator.js`)

## Database Schema

Auto-created PostgreSQL tables:
- `jobs` - Job listings with relevance scores and processing status
- `resume_analysis` - Cached resume analysis (refreshed weekly)
- `processed_emails` - Email processing tracking (prevents duplicates)
- `job_locks` - Mutex locks for concurrency control

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

- All database operations use connection pooling
- AI calls include retry logic and error handling
- Telegram messages support markdown formatting
- Email processing uses "unread-only" queries to avoid reprocessing
- Long-running operations provide progress updates via Telegram

## Testing

- Manual API endpoints: `POST /process`, `POST /daily-summary`, `GET /test-services`
- Telegram commands for interactive testing in development
- Service connection tests run on startup
- Add to memory. I would prefer to be given suggestion on popular and widely used libraries when there is an oppurtunity to use one during development.