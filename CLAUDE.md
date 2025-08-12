# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Job Digest Bot is an automated job alert curation system that processes job emails from Gmail using AI, matches them against user resumes, and sends relevant opportunities via Telegram. It runs on Node.js/TypeScript with PostgreSQL storage and deploys to Railway.

## Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build TypeScript to dist/
npm run start           # Run production build
npm run lint            # Run ESLint on TypeScript files  
npm run type-check      # Run TypeScript compiler without emitting files
```

## Core Architecture

### Service Layer Pattern
The application uses a service layer architecture with five main services:

- **JobProcessor** (`src/services/job-processor.ts`) - Main orchestrator that coordinates all other services
- **GmailService** - OAuth2-based Gmail API integration for reading job alert emails
- **OpenAIService** - AI-powered email classification, job extraction, and resume analysis
- **TelegramService** - Bot notifications with command handling and message formatting
- **DatabaseService** - PostgreSQL operations with connection pooling and mutex locks

### Data Flow
1. Cron jobs trigger `JobProcessor.processJobAlerts()` hourly
2. Gmail service fetches unread emails from last 3 days
3. OpenAI classifies emails as job-related using batch processing
4. For each job email: extract jobs → calculate relevance scores → save to database
5. Emails are marked as read and archived (not deleted)
6. Relevant jobs (≥60% relevance) are sent via Telegram
7. Daily summaries sent at 9 PM UTC with statistics

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

## Database Schema

Auto-created PostgreSQL tables:
- `jobs` - Job listings with relevance scores and processing status
- `resume_analysis` - Cached resume analysis (refreshed weekly)
- `processed_emails` - Email processing tracking (prevents duplicates)
- `job_locks` - Mutex locks for concurrency control

## Deployment Notes

- **Railway**: Uses Procfile, includes health check endpoint at `/health`
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