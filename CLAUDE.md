# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Job Digest Bot is an automated job alert curation system that processes job emails from Gmail using AI, matches them against user resumes, and sends relevant opportunities via Telegram. It runs on Node.js/TypeScript with NestJS framework, PostgreSQL storage and deploys to Railway. Built using Nx monorepo architecture.

## Development Commands

```bash
# Development (recommended for daily use)
npm run dev              # Start API with hot reload/watch mode (nx serve api --watch)
npm run start            # Start NestJS API server (nx serve api)
npm run start:dev        # Start API server with watch mode (same as dev)
npm run start:debug      # Start API server in debug mode
npm run start:prod       # Run production build

# Build & Testing
npm run build            # Build all applications (nx build)
npm run test             # Run tests (nx test)
npm run lint             # Run linting (nx lint)

# Database Management
npm run db:setup         # Setup database schema
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with initial data
```

## Core Architecture

### Nx Monorepo Structure
The application uses Nx monorepo with the following structure:

- **api/** - NestJS API application entry point
- **libs/database/** - Database entities, migrations, repositories using TypeORM
- **libs/ai/** - AI service abstractions and implementations  
- **libs/shared/** - Shared utilities and types
- **services/** - Core business logic services (Gmail, OpenAI, Telegram, Job Processing)

### Service Layer Pattern
The application uses a service layer architecture with main services in `services/src/lib/`:

- **JobProcessor** (`services/src/lib/job-processor.service.ts`) - Main orchestrator that coordinates all other services
- **GmailService** - OAuth2-based Gmail API integration for reading job alert emails
- **OpenAIService** - AI-powered email classification, job extraction, and resume analysis
- **TelegramService** - Bot notifications with command handling and message formatting
- **QueueService** - BullMQ-based job queue management

### Data Flow
1. Scheduled jobs or manual triggers initiate job processing via BullMQ queues
2. Gmail service fetches unread emails from configured timeframe  
3. OpenAI classifies emails as job-related using batch processing
4. For each job email: extract jobs → calculate relevance scores → save to database via TypeORM
5. Emails are processed and organized using database entities
6. Relevant jobs are queued for notification via Telegram
7. Job processing status tracked through database entities and user associations

### Queue Management
Uses BullMQ for job queue management:
- **Job Processing Queue**: Handles email processing and job extraction
- **Notification Queue**: Manages Telegram message sending
- **Retry Logic**: Built-in retry mechanisms for failed jobs
- **Progress Tracking**: Real-time job progress monitoring

### Database Layer
TypeORM-based data layer with entities:
- **Job**: Core job listings with metadata
- **User**: User management and preferences  
- **UserJob**: Many-to-many relationship between users and jobs
- **JobStage**: Job application pipeline stages
- **ProcessedEmail**: Email processing tracking
- **ResumeAnalysis**: Cached resume analysis results
- **JobLock**: Concurrency control mechanisms

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

TypeORM entities define the database schema with automatic migrations:
- **jobs** - Job listings with relevance scores and processing status
- **users** - User accounts and preferences  
- **user_jobs** - User-job associations with application stages
- **job_stages** - Configurable job application pipeline stages
- **processed_emails** - Email processing tracking (prevents duplicates)
- **resume_analysis** - Cached resume analysis (refreshed weekly)
- **job_locks** - Mutex locks for concurrency control

## Deployment Notes

- **Railway**: Uses Procfile, NestJS production build
- **Queue Processing**: BullMQ with Redis for job queue management
- **Database**: PostgreSQL with TypeORM migrations
- **Error Handling**: Structured logging and error tracking
- **Gmail Permissions**: Requires full Gmail scope (`https://mail.google.com/`) for archiving
- **API Rate Limits**: Uses batch processing to minimize OpenAI API calls

## Development Behavior

The Nx workspace provides:
- **Hot Reload**: Development server with watch mode (`npm run start:dev`)
- **Testing**: Jest-based testing across all libraries
- **Linting**: ESLint configuration for consistent code style
- **Database Management**: Migration and seeding commands
- **Queue Dashboard**: BullMQ dashboard for job monitoring

## Important Code Patterns

- **Nx Library Structure**: Shared code organized in publishable libraries
- **NestJS Modules**: Dependency injection and modular architecture
- **TypeORM Entities**: Database-first approach with decorators
- **BullMQ Jobs**: Asynchronous processing with retry logic
- **Service Layer**: Business logic separated from controllers
- **Configuration**: Environment-based configuration with validation

## Nx Standards & Best Practices

**IMPORTANT**: Always adhere to Nx conventions and standards:

- **Package.json Scripts**: Keep Nx-native commands (`nx build`, `nx serve api`)
- **Directory Structure**: Use `apps/` for applications, `libs/` for shared libraries
- **Build Process**: Let Nx handle intelligent builds and caching
- **Development vs Production**: 
  - Development: Use `nx serve api` for hot reload
  - Production: Use `node dist/apps/api/main` for direct execution
- **Never Override**: Avoid changing Nx's core build/serve commands unless absolutely necessary
- **Deployment**: Use production-specific scripts (`start:prod`) for Railway/production

## Testing & Monitoring

- **Unit Tests**: Jest tests for all libraries and services
- **E2E Tests**: API endpoint testing with test database
- **Queue Monitoring**: BullMQ dashboard for job status tracking
- **Health Checks**: Built-in health check endpoints
- **Database Debugging**: TypeORM query logging in development