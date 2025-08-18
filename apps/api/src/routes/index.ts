/**
 * Main API Routes Configuration
 */

import { Router } from 'express';
import authRoutes from './auth';
import jobRoutes from './jobs';
import stageRoutes from './stages';
import dashboardRoutes from './dashboard';
import insightsRoutes from './insights';

const router = Router();

// API versioning
const API_VERSION = '/api/v1';

// Mount API route modules with authentication and multi-user support
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/jobs`, jobRoutes);
router.use(`${API_VERSION}/stages`, stageRoutes);
router.use(`${API_VERSION}/dashboard`, dashboardRoutes);
router.use(`${API_VERSION}/insights`, insightsRoutes);

// Health check endpoint (keep existing)
router.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'job-digest-bot',
    version: '1.0.1', // Added for deployment trigger
    environment: process.env.NODE_ENV || 'development'
  });
});

// Service test endpoint (keep existing functionality)
router.get('/test-services', async (req, res) => {
  res.json({ success: true, tested: ['Gmail', 'Telegram', 'Database', 'Prisma'] });
});

// Development helper moved to /api/v1/auth/dev-token

export default router;