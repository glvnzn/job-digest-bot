# Release Process Documentation

## Overview

The Job Digest Bot follows a structured release process with semantic versioning, automated testing, and deployment pipelines.

## Release Types

### Semantic Versioning

We use **Semantic Versioning (SemVer)** format: `MAJOR.MINOR.PATCH`

| Type | When to Use | Examples |
|------|-------------|----------|
| **MAJOR** (x.0.0) | Breaking changes, API breaking changes, database schema breaking changes | New authentication system, API restructure, incompatible database changes |
| **MINOR** (x.y.0) | New features, new API endpoints, non-breaking schema additions | New Telegram commands, new dashboard features, new database tables |
| **PATCH** (x.y.z) | Bug fixes, security patches, performance improvements | Production hotfixes, security updates, optimization improvements |

### Current Version Strategy

- **Current Version**: v2.0.0 (Prisma migration completed)
- **Next Minor**: v2.1.0 (Web interface features)
- **Next Patch**: v2.0.1 (Bug fixes and improvements)

## Release Workflows

### 1. Automated Releases (GitHub Actions)

**Triggered by**: Push to `main` branch or manual workflow dispatch

```bash
# Workflow files
.github/workflows/release.yml  # Main release pipeline
.github/workflows/ci.yml       # Continuous integration
```

**Pipeline Steps**:
1. ✅ **Quality Checks**: Lint, TypeScript, Tests
2. ✅ **Build Verification**: Build both API and Web
3. ✅ **Version Bumping**: Auto-detect or manual release type
4. ✅ **Changelog Generation**: Auto-generate from commits
5. ✅ **Git Tagging**: Create versioned git tags
6. ✅ **GitHub Release**: Create GitHub release with notes
7. ✅ **Auto-Deploy**: Railway auto-deploys from main

### 2. Manual Releases (Release Script)

**Use the interactive release manager**:

```bash
# Interactive release process
npm run release

# What it does:
# 1. Validates git status and branch
# 2. Prompts for release type (patch/minor/major)
# 3. Runs quality checks (lint, type-check, build)
# 4. Updates package.json version
# 5. Generates changelog entry
# 6. Creates git commit and tag
# 7. Optionally pushes to origin
```

## Branch Strategy

```
main (production)
├── develop (staging/integration)
├── feature/feature-name (feature development)
├── release/v2.1.0 (release preparation)
└── hotfix/v2.0.1 (emergency fixes)
```

### Workflow Examples

#### **Feature Release (Minor Version)**
```bash
# 1. Feature development
git checkout develop
git checkout -b feature/user-dashboard
# ... develop feature ...
git push origin feature/user-dashboard

# 2. Create PR to develop
# 3. Merge to develop after review
# 4. Create release branch
git checkout develop
git checkout -b release/v2.1.0

# 5. Prepare release
npm run release  # Choose 'minor'
git push origin release/v2.1.0

# 6. Create PR to main
# 7. Merge triggers auto-deployment
```

#### **Hotfix Release (Patch Version)**
```bash
# 1. Create hotfix from main
git checkout main
git checkout -b hotfix/v2.0.1

# 2. Fix critical issue
# ... implement fix ...

# 3. Prepare hotfix release
npm run release  # Choose 'patch'
git push origin hotfix/v2.0.1

# 4. Create PR to main (emergency merge)
# 5. Merge back to develop
git checkout develop
git merge hotfix/v2.0.1
```

## Quality Gates

### Pre-Release Validation

All releases must pass these checks:

```bash
# Code Quality
npm run lint          # ESLint validation
npm run type-check    # TypeScript compilation
npm run format:check  # Code formatting

# Build Verification
npm run build         # Build all projects
npm run build:api     # API production build
npm run build:web     # Web production build

# Database Validation
npm run test:prisma   # Database connection test
npm run db:generate   # Prisma client generation

# Optional Testing
npm run test         # Unit/integration tests (when implemented)
```

### Production Readiness Checklist

Before any release to production:

- [ ] All CI checks pass
- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] API endpoints tested
- [ ] Telegram bot functionality verified
- [ ] Breaking changes documented
- [ ] Rollback plan prepared (for major changes)

## Deployment Pipeline

### Railway Production Deployment

**Automatic Deployment**:
- Railway auto-deploys from `main` branch
- Build command: `npx nx build api`
- Start command: `node dist/api/main.js`
- Environment variables: Managed in Railway dashboard

**Deployment Process**:
1. Code pushed to `main`
2. GitHub Actions create release
3. Railway detects changes
4. Railway builds and deploys
5. Health checks verify deployment
6. Telegram notifications (if configured)

### Environment Management

| Environment | Branch | URL | Purpose |
|-------------|--------|-----|---------|
| **Production** | `main` | Railway Production | Live system |
| **Development** | Local | `localhost:3333` | Local development |

## Release Documentation

### Changelog Management

**Automatic Generation**:
- Git commits analyzed for changes
- Conventional commit format preferred
- Release notes generated from commit messages

**Manual Curation**:
- Edit `CHANGELOG.md` for major releases
- Add context for breaking changes
- Document migration steps

### Version Documentation

**Release Notes Include**:
- ✅ **New Features**: What's new for users
- ✅ **Bug Fixes**: Issues resolved
- ✅ **Breaking Changes**: Migration required
- ✅ **Technical Changes**: Developer-focused changes
- ✅ **Security Updates**: Security-related fixes

### GitHub Release Creation

**Automated Process**:
1. Git tag created (`v2.1.0`)
2. GitHub release generated
3. Release notes from changelog
4. Assets attached (if applicable)

## Emergency Procedures

### Production Hotfixes

**Critical Issue Process**:
1. **Immediate Response**: Identify and isolate issue
2. **Hotfix Branch**: Create from `main` branch
3. **Quick Fix**: Minimal code changes only
4. **Fast-Track Testing**: Essential tests only
5. **Emergency Release**: Use `npm run release`
6. **Rapid Deployment**: Push to trigger auto-deploy
7. **Post-Mortem**: Document and prevent recurrence

### Rollback Strategy

**Database Rollback**:
```bash
# For schema changes
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma db push  # Restore previous schema
```

**Application Rollback**:
- Railway supports instant rollback to previous deployment
- Git revert critical commits if needed
- Monitor Telegram bot and API health

## Monitoring and Validation

### Post-Release Verification

**Automated Checks**:
- Railway deployment status
- API health endpoints
- Database connectivity

**Manual Verification**:
- [ ] Telegram bot responds to commands
- [ ] Job processing works correctly
- [ ] Web interface loads (when applicable)
- [ ] No error spikes in logs

### Release Communication

**Internal Notifications**:
- GitHub release notes
- Telegram notifications (if configured)
- Team communication channels

## Tools and Commands

### Quick Reference

```bash
# Release Management
npm run release                    # Interactive release manager
git tag -l                        # List all releases
git describe --tags               # Show current version

# Quality Assurance  
npm run lint && npm run type-check # Pre-release checks
npm run build                     # Verify build
npm run test:prisma              # Database health

# Emergency Commands
git revert HEAD~1                # Revert last commit
npm run db:migrate:deploy        # Deploy database changes
railway redeploy                 # Manual Railway redeploy
```

### Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/release.yml` | Automated release pipeline |
| `.github/workflows/ci.yml` | Continuous integration |
| `.github/pull_request_template.md` | PR template with release info |
| `scripts/release.js` | Manual release management |
| `CHANGELOG.md` | Version history |
| `railway.toml` | Deployment configuration |

---

📝 **Documentation Version**: 1.0  
🗓️ **Last Updated**: August 2025  
🤖 **Generated with**: [Claude Code](https://claude.ai/code)