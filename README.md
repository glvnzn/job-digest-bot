# Job Digest Bot

Automated job alert curation system built with Nx monorepo that reads job emails from Gmail, analyzes them with AI, and sends relevant opportunities to Telegram.

## Features

- 🔍 **Smart Email Processing**: Reads job alerts from LinkedIn, JobStreet, and other platforms
- 🧠 **AI-Powered Analysis**: Uses OpenAI to extract job details and calculate relevance scores
- 📊 **Resume Matching**: Analyzes your resume to find the most relevant opportunities
- 🤖 **Telegram Notifications**: Sends curated job listings to your Telegram chat
- 📁 **Auto Archiving**: Automatically archives processed emails (not deleted)
- ⏰ **Scheduled Processing**: Runs hourly to check for new opportunities
- 📈 **PostgreSQL Storage**: Tracks processed jobs and prevents duplicates

## Setup

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```env
# Gmail API
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://username:password@hostname:port/database
```

### 2. Gmail API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth2 credentials
5. Generate refresh token using the credentials

### 3. Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot with `/newbot`
3. Get your bot token
4. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)

### 4. Resume Setup

Place your resume as `resume.pdf` in the project root directory.

### 5. Database Setup

The app will automatically create the required PostgreSQL tables on first run.

## Development

```bash
# Install dependencies
npm install

# Development (Nx monorepo)
npm run dev              # Start both API and web
npm run dev:api          # Start API only
npm run dev:web          # Start web only (port 3000)

# Building
npm run build            # Build all projects
npm run build:api        # Build API only
npm run build:web        # Build web only

# Production
npm start                # Run production API

# Quality checks
npm run lint             # Lint all projects
npm run type-check       # TypeScript check
npm run format           # Format code

# Utilities
npm run generate-gmail-token  # Gmail OAuth setup
npm run nx:graph         # View project dependencies
```

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Set up PostgreSQL database addon
3. Configure environment variables
4. Deploy!

**Deployment Configuration:**
- Uses `railway.toml` with API-only builds
- Clean bundled output: `dist/api/main.js`
- Procfile: `web: node dist/api/main.js`

**Available Endpoints:**
- Health check: `GET /health`
- Manual processing: `POST /process`
- Daily summary: `POST /daily-summary`
- Service test: `GET /test-services`

**Telegram Commands:**
- `/process` - Manual job processing
- `/summary` - Get daily summary
- `/status` - Check bot status
- `/help` - Show detailed help

## How It Works

1. **Email Monitoring**: Every hour, the bot checks Gmail for job alert emails
2. **AI Processing**: OpenAI extracts job details from email content
3. **Resume Analysis**: Your resume is analyzed to understand your profile
4. **Relevance Scoring**: Each job gets a relevance score (0-100%)
5. **Filtering**: Only jobs meeting the relevance threshold are sent
6. **Telegram Notification**: Curated jobs are sent to your Telegram chat
7. **Archiving**: Processed emails are archived (not deleted) from Gmail

## Supported Job Platforms

- LinkedIn Job Alerts
- JobStreet
- Indeed
- Glassdoor
- Any job platform sending structured emails

## License

MIT