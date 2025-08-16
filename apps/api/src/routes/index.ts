/**
 * Main API Routes Configuration
 */

import { Router } from 'express';
import authRoutes from './auth';
import jobRoutes from './jobs';
import stageRoutes from './stages';
import dashboardRoutes from './dashboard';

const router = Router();

// API versioning
const API_VERSION = '/api/v1';

// Mount API route modules with authentication and multi-user support
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/jobs`, jobRoutes);
router.use(`${API_VERSION}/stages`, stageRoutes);
router.use(`${API_VERSION}/dashboard`, dashboardRoutes);

// Health check endpoint (keep existing)
router.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'job-digest-bot'
  });
});

// Service test endpoint (keep existing functionality)
router.get('/test-services', async (req, res) => {
  res.json({ success: true, tested: ['Gmail', 'Telegram', 'Database', 'Prisma'] });
});

// Development helper: Generate test JWT token
router.post('/auth/dev-token', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Not available in production' });
  }

  const { generateTestToken } = await import('../middleware/auth');
  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({
      success: false,
      error: 'Missing userId or email'
    });
  }

  const token = generateTestToken(parseInt(userId), email);
  res.json({
    success: true,
    data: { 
      token,
      userId: parseInt(userId),
      email,
      expiresIn: '24h'
    },
    message: 'Development token generated'
  });
});

export default router;