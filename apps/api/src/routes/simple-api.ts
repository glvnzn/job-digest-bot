/**
 * Simplified API Routes for Initial Testing
 * 
 * Basic endpoints that work with current Prisma setup
 */

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';

const router = Router();
const db = new DatabaseService();

// Initialize database connection
db.init().catch(console.error);

/**
 * GET /api/v1/jobs - Simple job listing
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const jobs = await db.prisma.client.job.findMany({
      take: limit,
      skip: offset,
      orderBy: [
        { relevanceScore: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        isRemote: true,
        description: true,
        applyUrl: true,
        salary: true,
        relevanceScore: true,
        createdAt: true
      }
    });

    const total = await db.prisma.client.job.count();

    res.json({
      success: true,
      data: jobs,
      meta: {
        total,
        limit,
        offset,
        count: jobs.length
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
});

/**
 * GET /api/v1/jobs/:id - Get job details
 */
router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    
    const job = await db.prisma.client.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job details'
    });
  }
});

/**
 * GET /api/v1/stats - Basic statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [totalJobs, remoteJobs, recentJobs] = await Promise.all([
      db.prisma.client.job.count(),
      db.prisma.client.job.count({ where: { isRemote: true } }),
      db.prisma.client.job.count({ 
        where: { 
          createdAt: { 
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
          } 
        } 
      })
    ]);

    res.json({
      success: true,
      data: {
        totalJobs,
        remoteJobs,
        recentJobs
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * POST /api/v1/users - Create test user
 */
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, googleId, name } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing email or googleId'
      });
    }

    const user = await db.prisma.createUser({
      email,
      googleId,
      name
    });

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

/**
 * GET /api/v1/users/:id - Get user
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    const user = await db.prisma.client.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

/**
 * GET /api/v1/stages - Get job stages
 */
router.get('/stages', async (req: Request, res: Response) => {
  try {
    const stages = await db.prisma.client.jobStage.findMany({
      where: { isSystem: true },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      success: true,
      data: stages
    });
  } catch (error) {
    console.error('Error fetching stages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job stages'
    });
  }
});

export default router;