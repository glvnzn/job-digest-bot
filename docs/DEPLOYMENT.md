# Deployment Guide

This guide covers deploying both the API and web applications for the Job Digest Bot.

## Prerequisites

- API deployed to Railway: `https://job-digest-bot-production.up.railway.app`
- Production PostgreSQL database set up
- Required environment variables configured

## API Deployment (Railway)

The API is already deployed to Railway at:
```
https://job-digest-bot-production.up.railway.app
```

### Required Environment Variables (Railway)
```env
# Gmail API
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Application
NODE_ENV=production
PORT=3333
```

## Web Application Deployment

### Option 1: Vercel (Recommended for NextAuth.js)

**Important**: NextAuth.js requires a Node.js runtime, not static hosting.

1. **Connect Repository**
   ```bash
   # Fork or use this repository
   # Connect to Vercel via GitHub integration
   ```

2. **Configure Build Settings**
   - Build Command: `npm run build:web`
   - Output Directory: `apps/web/.next`
   - Install Command: `npm install`
   - **Framework Preset**: Next.js (automatically configured for Node.js runtime)

3. **Environment Variables**
   ```env
   # API Configuration
   NEXT_PUBLIC_API_BASE=https://job-digest-bot-production.up.railway.app
   NEXT_PUBLIC_API_URL=https://job-digest-bot-production.up.railway.app
   
   # NextAuth Configuration
   NEXTAUTH_URL=https://your-app-name.vercel.app
   NEXTAUTH_SECRET=your-secure-random-string
   
   # Google OAuth (for web authentication)
   GOOGLE_CLIENT_ID=your_web_google_client_id
   GOOGLE_CLIENT_SECRET=your_web_google_client_secret
   ```

4. **Deploy**
   ```bash
   # Automatic deployment on git push
   # Or manual deploy from Vercel dashboard
   ```

### Option 2: Railway (Node.js Support)

**Note**: Netlify static hosting is not compatible with NextAuth.js. Use Railway for Node.js support.

1. **Connect Repository**
   ```bash
   # Create new Railway project
   # Connect GitHub repository
   ```

2. **Configure Build**
   ```bash
   # Build command
   npm run build:web
   
   # Start command (Railway auto-detects Next.js)
   npm run start:web
   ```

### Option 3: Other Node.js Hosting Platforms

**Compatible Platforms** (require Node.js runtime):
- **Heroku**: Node.js buildpack
- **DigitalOcean App Platform**: Node.js runtime
- **AWS Amplify**: Server-side rendering support
- **Render**: Node.js service

**Incompatible Platforms** (static hosting only):
- ❌ Netlify (static hosting)
- ❌ GitHub Pages (static hosting)  
- ❌ AWS S3 + CloudFront (static hosting)

3. **Environment Variables**
   Same as Vercel configuration, but adjust `NEXTAUTH_URL` to your hosting platform's URL.

## Google OAuth Setup

### For Web Application Authentication

1. **Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Google+ API

2. **Create OAuth Credentials**
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     https://your-web-app-url.vercel.app/api/auth/callback/google
     http://localhost:3000/api/auth/callback/google (for development)
     ```

3. **Configure Environment Variables**
   ```env
   GOOGLE_CLIENT_ID=your_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_oauth_client_secret
   ```

## Verification Steps

### 1. API Health Check
```bash
curl https://job-digest-bot-production.up.railway.app/health
```

### 2. Web Application
- Visit your deployed web app URL
- Test authentication flow
- Verify API connectivity

### 3. Database Connection
```bash
# From local development
npm run test:prisma
```

## Environment Configuration Summary

### Development (.env.local)
```env
NEXT_PUBLIC_API_BASE=http://localhost:3333
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret
GOOGLE_CLIENT_ID=your_dev_google_client_id
GOOGLE_CLIENT_SECRET=your_dev_google_client_secret
```

### Production (Deployment Platform)
```env
NEXT_PUBLIC_API_BASE=https://job-digest-bot-production.up.railway.app
NEXT_PUBLIC_API_URL=https://job-digest-bot-production.up.railway.app
NEXTAUTH_URL=https://your-web-app-url.vercel.app
NEXTAUTH_SECRET=your-secure-production-secret
GOOGLE_CLIENT_ID=your_prod_google_client_id
GOOGLE_CLIENT_SECRET=your_prod_google_client_secret
```

## Security Considerations

1. **NEXTAUTH_SECRET**: Use a secure random string
2. **Google OAuth**: Separate credentials for development and production
3. **CORS**: API should allow your web app domain
4. **Environment Variables**: Never commit secrets to repository

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Verify `NEXT_PUBLIC_API_BASE` is correct
   - Check CORS configuration on API
   - Ensure API is deployed and running

2. **Authentication Issues**
   - Verify Google OAuth redirect URIs
   - Check `NEXTAUTH_URL` matches deployed URL
   - Ensure `NEXTAUTH_SECRET` is set

3. **Build Failures**
   - Run `npm run type-check:web` locally
   - Check environment variables are set
   - Verify Node.js version compatibility

### Debug Commands

```bash
# Generate API types
npm run generate-api-types

# Test TypeScript compilation
npm run type-check:web

# Test build locally
npm run build:web
```

## Post-Deployment

1. **Monitor Logs**: Check both API and web application logs
2. **Test Features**: Authentication, job listing, API connectivity
3. **Update Documentation**: Update URLs in README and other docs
4. **Set up Monitoring**: Consider adding error tracking (Sentry, etc.)