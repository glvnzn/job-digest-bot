# Railway Deployment Guide

This document provides instructions for deploying both the API and Web applications to Railway.

## Current Deployment Status

- **API**: Already deployed at `https://job-digest-bot-production.up.railway.app`
- **Web**: Ready for deployment (new service)

## Repository Structure

```
job-digest-bot/
├── railway.toml          # API deployment configuration
├── railway-web.toml      # Web app deployment configuration
├── .env                  # Development environment variables
├── .env.web.production   # Web app production environment template
├── apps/
│   ├── api/             # Backend Express.js API
│   └── web/             # Frontend Next.js application
```

## Deploying the API (Already Done)

The API is currently deployed using:
- Configuration: `railway.toml`
- Build: `npm run build:api`
- Start: `npm start` (runs API server)
- Health check: `/health`

## Deploying the Web Application

### 1. Create New Railway Service

1. Go to Railway dashboard
2. Create a new service in the same project
3. Connect to the same GitHub repository
4. Select "Use Custom Config" and specify `railway-web.toml`

### 2. Configure Environment Variables

Set these environment variables in the Railway web service dashboard:

```bash
# API Connection
NEXT_PUBLIC_API_URL=https://job-digest-bot-production.up.railway.app

# NextAuth Configuration
NEXTAUTH_URL=https://your-web-app-production.up.railway.app
NEXTAUTH_SECRET=your-generated-nextauth-secret

# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Application Environment
NODE_ENV=production
PORT=3000
```

### 3. Update API CORS Configuration

After deploying the web app, update the API service environment variables:

```bash
WEB_APP_URL=https://your-actual-web-app-url.up.railway.app
```

### 4. Deploy

1. Railway will automatically build and deploy using `railway-web.toml`
2. Build command: `npm run build:web`
3. Start command: `npm run start:web`
4. Health check: `/` (Next.js default page)

## Environment Variables Reference

### API Service Environment Variables
- `NODE_ENV=production`
- `PORT=3333`
- `WEB_APP_URL=https://your-web-app-url.up.railway.app`
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (for queues)
- `GMAIL_*` (email processing)
- `OPENAI_API_KEY` (AI processing)
- `TELEGRAM_*` (notifications)
- `JWT_SECRET` (authentication)

### Web Service Environment Variables
- `NODE_ENV=production`
- `PORT=3000`
- `NEXT_PUBLIC_API_URL=https://job-digest-bot-production.up.railway.app`
- `NEXTAUTH_URL=https://your-web-app-url.up.railway.app`
- `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` (OAuth)
- `GOOGLE_CLIENT_SECRET` (OAuth)

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Web App       │    │   API Server    │
│  (Next.js)      │────│  (Express.js)   │
│  Port 3000      │    │  Port 3333      │
└─────────────────┘    └─────────────────┘
         │                       │
         │                       ├── PostgreSQL
         │                       ├── Redis
         └─── Authenticated ─────├── Gmail API
             API Requests        ├── OpenAI API
                                └── Telegram Bot
```

## Deployment Scripts

The following npm scripts are used for deployment:

```json
{
  "build:api": "npx nx build api",
  "build:web": "npx nx build web", 
  "start:api": "npx nx start api",
  "start:web": "npx nx start web"
}
```

## Security Considerations

1. **CORS**: API only accepts requests from configured web app domains
2. **Authentication**: Web app uses NextAuth with Google OAuth
3. **API Security**: JWT tokens for API authentication
4. **Environment Variables**: All secrets stored in Railway environment

## Monitoring

- **API Health**: `GET /health`
- **Web Health**: `GET /` (Next.js renders home page)
- **Logs**: Available in Railway dashboard for both services
- **Errors**: Telegram notifications for API errors

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `WEB_APP_URL` is set correctly in API environment
2. **Build Failures**: Check Nx workspace configuration in logs
3. **Authentication Issues**: Verify NextAuth configuration and Google OAuth setup
4. **API Connection**: Ensure `NEXT_PUBLIC_API_URL` points to correct API endpoint

### Useful Commands

```bash
# Test API deployment
curl https://job-digest-bot-production.up.railway.app/health

# Check API endpoints
curl https://job-digest-bot-production.up.railway.app/api/v1/jobs?limit=1

# Test web app
curl https://your-web-app-url.up.railway.app
```