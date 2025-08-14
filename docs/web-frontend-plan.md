# Job Digest Bot - Web Frontend Development Plan

## 📋 Project Overview

Transform the existing Job Digest Bot from a Telegram-only notification system into a comprehensive job management platform with a web-based kanban board interface.

### Vision
Enable users to manage their entire job hunting journey through an intuitive web interface while maintaining the existing AI-powered job discovery capabilities.

### Core User Story
*"As a job seeker, I want to track and manage job opportunities in a visual kanban board so that I can organize my application process from discovery to offer."*

---

## 🏗️ Technical Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast, lightweight)
- **Routing**: TanStack Router
- **State Management**: TanStack Query (server state)
- **UI Framework**: Tailwind CSS
- **Drag & Drop**: @dnd-kit
- **Tables**: TanStack Table
- **Icons**: Lucide React

#### Backend (Existing + Extensions)
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Hosting**: Railway (existing)
- **Authentication**: Google OAuth2

#### Deployment
- **Frontend**: Static site (Netlify/Vercel)
- **Backend**: Railway (existing)
- **CDN**: Automatic via static hosting

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Gmail API     │───▶│   Job Digest Bot │───▶│   PostgreSQL    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        ▲
                                ▼                        │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Telegram Bot    │◀───│   Express API    │───▶│  React Frontend │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Google OAuth2    │
                       └──────────────────┘
```

---

## 📊 Database Design

### New Tables Required

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  avatar_url TEXT,
  telegram_chat_id VARCHAR(255), -- Link to existing bot users
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  settings JSONB DEFAULT '{}' -- User preferences
);
```

#### Job Stages Table
```sql
CREATE TABLE job_stages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id), -- Custom stages per user
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7), -- Hex color code
  sort_order INTEGER,
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false, -- System vs user-created
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### User Jobs Tracking Table
```sql
CREATE TABLE user_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  job_id INTEGER REFERENCES jobs(id),
  stage_id INTEGER REFERENCES job_stages(id),
  is_interested BOOLEAN DEFAULT false,
  applied_date TIMESTAMP,
  interview_date TIMESTAMP,
  notes TEXT,
  application_url TEXT, -- Link to application portal
  contact_person VARCHAR(255),
  salary_expectation INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, job_id) -- Prevent duplicates
);
```

#### Default System Stages
```sql
INSERT INTO job_stages (name, color, sort_order, is_default, is_system) VALUES
('Interested', '#3B82F6', 1, true, true),
('Applied', '#F59E0B', 2, false, true),
('Phone Screen', '#8B5CF6', 3, false, true),
('Technical Interview', '#06B6D4', 4, false, true),
('Final Round', '#10B981', 5, false, true),
('Offer Received', '#22C55E', 6, false, true),
('Accepted', '#16A34A', 7, false, true),
('Rejected', '#EF4444', 8, false, true),
('Not Interested', '#6B7280', 9, false, true);
```

### Existing Tables (No Changes Required)
- `jobs` - Current job listings
- `resume_analysis` - AI analysis cache
- `processed_emails` - Email tracking
- `job_locks` - Concurrency control

---

## 🔌 API Design

### Authentication Endpoints
```typescript
GET    /api/auth/google           // Initiate Google OAuth
GET    /api/auth/callback         // OAuth callback
GET    /api/auth/me               // Get current user info
POST   /api/auth/logout           // Clear session
POST   /api/auth/link-telegram    // Link Telegram account
```

### Job Management Endpoints
```typescript
GET    /api/jobs                  // List all jobs with filters
GET    /api/jobs/:id              // Get specific job details
POST   /api/jobs/:id/interest     // Mark job as interested
DELETE /api/jobs/:id/interest     // Remove interest
PUT    /api/jobs/:id/stage        // Update job stage
PUT    /api/jobs/:id/notes        // Update job notes
GET    /api/jobs/:id/history      // Get job stage history
```

### Kanban Board Endpoints
```typescript
GET    /api/user-jobs             // Get user's tracked jobs
POST   /api/user-jobs             // Add job to tracking
PUT    /api/user-jobs/:id         // Update job tracking info
DELETE /api/user-jobs/:id         // Remove from tracking

GET    /api/stages                // Get user's stages
POST   /api/stages                // Create custom stage
PUT    /api/stages/:id            // Update stage
DELETE /api/stages/:id            // Delete custom stage
PUT    /api/stages/reorder        // Reorder stages
```

### Analytics Endpoints
```typescript
GET    /api/dashboard/stats       // Dashboard metrics
GET    /api/dashboard/timeline    // Application timeline
GET    /api/reports/weekly        // Weekly summary
GET    /api/reports/companies     // Company application stats
```

### API Response Formats
```typescript
// Standard API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Job with user tracking info
interface JobWithTracking extends Job {
  userJob?: {
    stage: JobStage;
    notes: string;
    appliedDate: string;
    isInterested: boolean;
  };
}
```

---

## 🎨 Frontend Architecture

### Project Structure
```
job-digest-frontend/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── auth/               # Authentication components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── GoogleLoginButton.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── jobs/               # Job-related components
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobTable.tsx
│   │   │   ├── JobFilters.tsx
│   │   │   ├── JobDetails.tsx
│   │   │   └── JobActions.tsx
│   │   ├── kanban/             # Kanban board components
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── JobTicket.tsx
│   │   │   └── StageHeader.tsx
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── StatsCards.tsx
│   │   │   ├── ActivityChart.tsx
│   │   │   └── RecentActivity.tsx
│   │   └── layout/             # Layout components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Navigation.tsx
│   │       └── AppLayout.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── JobsPage.tsx        # Main job listing
│   │   ├── KanbanPage.tsx      # Kanban board view
│   │   ├── SettingsPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useJobs.ts
│   │   ├── useUserJobs.ts
│   │   ├── useStages.ts
│   │   └── useLocalStorage.ts
│   ├── services/               # API service layer
│   │   ├── api.ts              # Base API client
│   │   ├── auth.ts             # Auth service
│   │   ├── jobs.ts             # Jobs service
│   │   └── stages.ts           # Stages service
│   ├── types/                  # TypeScript definitions
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── jobs.ts
│   │   └── kanban.ts
│   ├── utils/                  # Utility functions
│   │   ├── dateUtils.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── stores/                 # Global state (if needed)
│   │   └── authStore.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── components.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

### Key React Hooks Design
```typescript
// useJobs - Main job data management
export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => jobsApi.getJobs(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// useUserJobs - Kanban board data
export function useUserJobs() {
  return useQuery({
    queryKey: ['user-jobs'],
    queryFn: () => jobsApi.getUserJobs(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// useJobStageUpdate - Optimistic updates
export function useJobStageUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, stageId }: { jobId: number; stageId: number }) =>
      jobsApi.updateJobStage(jobId, stageId),
    onMutate: async ({ jobId, stageId }) => {
      // Optimistic update logic
    },
    onError: () => {
      // Rollback on error
    },
  });
}
```

---

## 🎯 Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Backend Setup**
- [ ] Database schema migration
- [ ] Google OAuth integration
- [ ] Basic API endpoints
- [ ] User registration flow

**Frontend Setup**
- [ ] Vite + React project initialization
- [ ] TanStack Router setup
- [ ] TanStack Query configuration
- [ ] Tailwind CSS installation
- [ ] Basic layout components

### Phase 2: Authentication & Job Listing (Weeks 3-4)
**Features**
- [ ] Google login flow
- [ ] Protected routes
- [ ] Job listing page
- [ ] Basic job cards
- [ ] Interest marking functionality

**Components**
- [ ] LoginPage
- [ ] JobCard
- [ ] JobTable
- [ ] JobActions

### Phase 3: Kanban Board Core (Weeks 5-6)
**Features**
- [ ] Basic kanban board layout
- [ ] Drag and drop functionality
- [ ] Stage transitions
- [ ] Job details modal

**Components**
- [ ] KanbanBoard
- [ ] KanbanColumn
- [ ] JobTicket
- [ ] JobDetailsModal

### Phase 4: Advanced Features (Weeks 7-8)
**Features**
- [ ] Custom stages
- [ ] Job notes and dates
- [ ] Advanced filters
- [ ] Dashboard with analytics

**Components**
- [ ] StageManagement
- [ ] JobFilters
- [ ] Dashboard
- [ ] SettingsPage

### Phase 5: Polish & Deployment (Weeks 9-10)
**Features**
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Error handling
- [ ] Loading states
- [ ] Production deployment

---

## 📱 User Experience Design

### Key User Flows

#### 1. First-Time User Journey
```
Landing Page → Google Login → Account Setup → Job List Tutorial → Kanban Intro
```

#### 2. Daily Usage Flow
```
Login → Dashboard Overview → New Jobs Review → Interest Marking → Kanban Management
```

#### 3. Application Tracking Flow
```
Job Discovery → Mark Interested → Move to Applied → Add Notes → Interview Scheduling → Outcome Update
```

### Responsive Design Breakpoints
```css
/* Mobile First Approach */
sm: '640px',   // Small devices
md: '768px',   // Medium devices  
lg: '1024px',  // Large devices
xl: '1280px',  // Extra large devices
2xl: '1536px'  // 2X Extra large devices
```

### Accessibility Requirements
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode
- Focus indicators
- ARIA labels for complex components

---

## 🔧 Integration Strategy

### Connecting with Existing Bot

#### User Account Linking
```typescript
// Link Telegram account to web account
POST /api/auth/link-telegram
{
  "telegram_chat_id": "123456789",
  "verification_code": "ABC123" // Sent via Telegram
}
```

#### Data Synchronization
- **Bot → Web**: New jobs automatically appear in web interface
- **Web → Bot**: User preferences affect bot notification settings
- **Bidirectional**: Job stage updates sync between platforms

#### Notification Strategy
```typescript
// User notification preferences
interface NotificationSettings {
  telegram: {
    enabled: boolean;
    relevanceThreshold: number;
    frequency: 'realtime' | 'hourly' | 'daily';
  };
  email: {
    enabled: boolean;
    weeklyDigest: boolean;
    stageUpdates: boolean;
  };
  web: {
    browserNotifications: boolean;
    soundEnabled: boolean;
  };
}
```

---

## 📊 Success Metrics & Analytics

### User Engagement Metrics
- **Daily Active Users (DAU)**
- **Weekly Active Users (WAU)**
- **Session Duration**
- **Page Views per Session**
- **Feature Adoption Rate**

### Job Management Metrics
- **Jobs Marked as Interested per User**
- **Average Time in Each Stage**
- **Stage Completion Rate**
- **Jobs Applied to per Week**
- **Success Rate (Offers/Applications)**

### Technical Metrics
- **Page Load Times**
- **API Response Times**
- **Error Rates**
- **Mobile vs Desktop Usage**
- **Browser Compatibility**

### Business Metrics
- **User Retention (1-day, 7-day, 30-day)**
- **Feature Usage Distribution**
- **User Feedback Scores**
- **Support Ticket Volume**

---

## 🚀 Deployment Strategy

### Frontend Deployment (Static Site)

#### Netlify Configuration
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  VITE_API_BASE = "https://job-digest-api.railway.app/api"
  VITE_GOOGLE_CLIENT_ID = "your-google-client-id"

[context.deploy-preview.environment]
  VITE_API_BASE = "https://job-digest-staging.railway.app/api"
```

#### Vercel Configuration
```json
{
  "build": {
    "env": {
      "VITE_API_BASE": "https://job-digest-api.railway.app/api",
      "VITE_GOOGLE_CLIENT_ID": "@google-client-id"
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Backend Updates (Railway)

#### Environment Variables
```env
# Existing variables
DATABASE_URL=postgresql://...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
OPENAI_API_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# New variables for web frontend
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
SESSION_SECRET=...
FRONTEND_URL=https://job-digest.netlify.app
CORS_ORIGINS=https://job-digest.netlify.app,http://localhost:5173
```

### CI/CD Pipeline

#### GitHub Actions for Frontend
```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Run tests
        run: cd frontend && npm test
      
      - name: Build
        run: cd frontend && npm run build
        env:
          VITE_API_BASE: ${{ secrets.API_BASE }}
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=frontend/dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 💰 Cost Analysis

### Development Costs (Time Investment)
- **Phase 1-2**: ~40 hours (Backend + Auth)
- **Phase 3-4**: ~60 hours (Kanban + Features)  
- **Phase 5**: ~20 hours (Polish + Deploy)
- **Total**: ~120 hours (~3 months part-time)

### Hosting Costs (Monthly)
- **Frontend (Netlify/Vercel)**: Free tier sufficient
- **Backend (Railway)**: $5-20/month (existing)
- **Database**: Included in Railway
- **CDN**: Included in static hosting
- **Total Additional Cost**: $0/month

### Potential Revenue Streams
- **Premium Features**: Advanced analytics, custom integrations
- **Team Accounts**: Multi-user workspaces
- **API Access**: Third-party integrations
- **White-label Solutions**: Custom deployments

---

## 🔐 Security Considerations

### Authentication Security
- **OAuth 2.0** with Google (industry standard)
- **JWT tokens** with short expiration (15 minutes)
- **Refresh token rotation**
- **Secure cookie storage** (httpOnly, secure, sameSite)

### API Security
- **CORS configuration** for allowed origins
- **Rate limiting** (express-rate-limit)
- **Input validation** (Joi/Zod)
- **SQL injection prevention** (parameterized queries)
- **XSS protection** (helmet.js)

### Data Protection
- **HTTPS enforcement**
- **Data encryption at rest** (PostgreSQL)
- **Sensitive data masking** in logs
- **GDPR compliance** considerations
- **Data retention policies**

### Frontend Security
- **Content Security Policy (CSP)**
- **Subresource Integrity (SRI)**
- **Environment variable protection**
- **Bundle analysis** for security vulnerabilities

---

## 📚 Documentation Requirements

### Technical Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Database schema documentation
- [ ] Frontend component library (Storybook)
- [ ] Deployment guides
- [ ] Development setup instructions

### User Documentation
- [ ] User onboarding guide
- [ ] Feature tutorials
- [ ] FAQ section
- [ ] Troubleshooting guide
- [ ] Privacy policy and terms of service

### Developer Documentation
- [ ] Contributing guidelines
- [ ] Code style guide
- [ ] Testing strategy
- [ ] Performance optimization guide
- [ ] Security best practices

---

## 🎉 Next Steps

### Immediate Actions
1. **Create GitHub repository** for frontend code
2. **Set up development environment** with Vite + React
3. **Design database migrations** for new tables
4. **Create API endpoint specifications**
5. **Set up project management** (GitHub Projects/Trello)

### Pre-Development Checklist
- [ ] Finalize technology stack decisions
- [ ] Create detailed wireframes/mockups
- [ ] Set up development and staging environments
- [ ] Establish code review process
- [ ] Define testing strategy
- [ ] Plan user testing approach

### Risk Mitigation
- **Technical Risks**: Start with MVP, iterative development
- **User Adoption**: Gradual rollout, user feedback loops
- **Performance**: Load testing, monitoring setup
- **Security**: Security audit, penetration testing
- **Maintenance**: Documentation, automated testing

---

*This document serves as the foundation for transforming the Job Digest Bot into a comprehensive job management platform. It should be reviewed and updated as development progresses and requirements evolve.*