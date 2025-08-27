# CLAUDE.md

Job Digest Bot - Automated job alert curation system using AI. Nx monorepo with Node.js/TypeScript API and Next.js web interface.

## Quick Start Commands

```bash
# Development
npm run dev              # API + Web (port 3000)
npm run dev:api          # API only 
npm run dev:web          # Web only

# Database (Prisma)
npm run db:push          # Dev schema changes
npm run db:migrate       # Production migrations
npm run db:studio        # Database GUI

# Quality
npm run lint             # ESLint all projects
npm run type-check       # TypeScript validation
npm run test             # Run tests

# Production
npm run build            # Build all
npm run start            # Start production

# Utilities
npm run generate-gmail-token    # Gmail OAuth setup
npm run generate-api-types      # API TypeScript types
```

## Architecture

### Monorepo Structure
- **API** (`apps/api/`) - Node.js/Express backend with service layer
- **Web** (`apps/web/`) - Next.js 15 frontend with shadcn/ui

### Core Services
- **JobProcessor** - Main orchestrator for email processing
- **GmailService** - OAuth2 email fetching
- **OpenAIService** - AI classification, job extraction, relevance scoring
- **EmailOrganizerService** - Organizes non-job emails with labels and actions
- **TelegramService** - Bot notifications and commands
- **DatabaseService** - Prisma ORM operations
- **QueueService** - BullMQ background processing

### Data Flow
1. Cron triggers hourly (6 AM-8 PM Manila)
2. Fetch unread emails (last 3 days)
3. AI classifies job-related emails
4. **NEW**: Organize non-job emails → rule-based + AI classification → Gmail labels + actions
5. Extract jobs → deduplication → relevance scoring
6. Save to database, send relevant jobs (≥60%) via Telegram
7. Daily summary at 9 PM

### Job Deduplication
- **URL-based hashing** for deterministic IDs
- **Content-based hashing** for jobs without URLs
- **Database-level checks** prevent duplicates
- **Early exit** skips AI processing for known jobs

### Email Organization (NEW)
- **Hybrid Classification** - Rule-based (free) + AI fallback (paid) for non-job emails
- **Cost Efficient** - ~90% classified by rules, ~10% by AI (~$0.004 per 25 emails)
- **Gmail Labels** - Auto-creates organized labels: Security, Finance, Shopping, etc.
- **Smart Actions** - Archives newsletters/promos, keeps important emails in inbox
- **Configurable** - Easily customize rules, actions, and thresholds via environment variables
- **Safe by Default** - Never deletes emails, graceful error handling, dry-run mode

## Environment Variables

### API Required
```env
# Gmail OAuth2
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# OpenAI & Telegram
OPENAI_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Database & Queue
DATABASE_URL=postgresql://
REDIS_URL=redis://

# Auth
JWT_SECRET=
ADMIN_EMAIL=

# Email Organization (Optional)
EMAIL_ORGANIZATION_ENABLED=true        # Enable email organization
EMAIL_RULE_CONFIDENCE_THRESHOLD=0.8    # Rule confidence threshold
EMAIL_AI_FALLBACK=true                 # AI fallback for low confidence
EMAIL_MAX_AI_COST_PER_RUN=0.10        # Max AI cost per run
EMAIL_CREATE_LABELS=true               # Create Gmail labels
EMAIL_DRY_RUN=false                    # Test mode without actions
```

### Web Required
```env
# API Connection
NEXT_PUBLIC_API_URL=https://job-digest-bot-production.up.railway.app

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Development
```env
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXTAUTH_URL=http://localhost:3000
```

## Database Schema (Prisma)

### Core Tables
- **jobs** - Job listings with relevance scores (deterministic hash IDs)
- **resume_analysis** - Cached AI resume parsing (weekly refresh)
- **processed_emails** - Email tracking (prevents duplicates)
- **job_locks** - Mutex locks for concurrency control

### Multi-User Tables
- **users** - Google OAuth accounts with admin flags
- **job_stages** - Kanban pipeline stages (system + custom)
- **user_jobs** - Job tracking with notes and metadata

### Market Intelligence
- **tech_trends** - Technology demand tracking
- **tech_trend_weekly** - Time-series analytics
- **job_insights** - AI job analysis
- **market_snapshots** - Daily market summaries
- **user_insights** - Personalized career recommendations

## Authentication
- **Google OAuth only** via NextAuth.js
- **All routes protected** except `/login`
- **Middleware-based** auth validation
- **JWT tokens** for API access
- **No development bypass** - auth required everywhere

## Development Patterns

### Database (Prisma)
- Type-safe operations with auto-generated client
- `db:push` for dev, `db:migrate` for production
- Connection pooling and query optimization
- Deduplication: `jobExists()`, `findSimilarJobs()`

### API Architecture
- Service layer with dependency injection
- BullMQ queues with Redis persistence
- Comprehensive error handling → Telegram alerts
- End-to-end TypeScript safety

### AI Integration
- Batch OpenAI calls for cost optimization
- Resume analysis caching (weekly refresh)
- Deterministic job IDs prevent duplicates
- Configurable relevance thresholds (60%)

## Deployment

### Railway (API)
- Build: `npx nx build api` → `dist/api/main.js`
- Redis addon for BullMQ queues
- PostgreSQL with automatic backups
- All API env vars required

### Production Features
- Cron scheduling (hourly 6AM-8PM, daily summary 9PM)
- Background job processing with progress tracking
- Rate limiting for external APIs
- Real-time error monitoring via Telegram

## Technology Stack

### Backend
- Node.js 18+ + TypeScript 5.8
- Express.js + Prisma ORM
- BullMQ + Redis queues
- OpenAI GPT-4o-mini
- Gmail API + Telegram Bot API

### Frontend
- Next.js 15 + App Router
- Tailwind CSS + shadcn/ui
- TanStack Query for server state
- NextAuth.js for Google OAuth
- Auto-generated API types

## Testing & Development

### Manual Testing
- API endpoints: `/process`, `/daily-summary`, `/test-services`
- Telegram commands: `/process`, `/summary`, `/status`
- Database: `npm run test:prisma`

### Development Workflow
1. Schema changes: Edit `prisma/schema.prisma` → `npm run db:push`
2. API dev: `npm run dev:api` → Test via Telegram/endpoints
3. Web dev: `npm run dev:web` → Full-stack with hot reload
4. Type generation: `npm run generate-api-types`

## Library Preferences
- UI: shadcn/ui, Radix UI
- State: TanStack Query, Zustand
- Forms: React Hook Form + Zod
- Testing: Jest, Vitest, Playwright
- **Principle**: Thin frontend, business logic in API

## Current Status (August 2025)

### ✅ Implemented
- Complete job deduplication system
- Market intelligence & analytics
- Multi-user database schema
- Google OAuth authentication
- Background queue processing
- Real-time progress tracking

### 🚀 Next Priorities
1. Web interface enhancement
2. Advanced analytics features
3. API documentation completion
4. Testing infrastructure
5. Performance optimization

## Development Notes
- Place `resume.pdf` in project root for AI relevance scoring
- Use `npm run generate-gmail-token` for OAuth setup
- Check running processes before starting dev servers
- Authentication required for all pages (no bypass mode)
- All API endpoints require JWT authentication