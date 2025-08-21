/**
 * Job Management API Routes (All Protected)
 * 
 * Provides endpoints for:
 * - Authenticated job listings with user context
 * - Job filtering and search (with user-specific features)
 * - Individual job details with tracking status
 * - User-specific job management
 */

import { Router, Request, Response } from 'express';
import { Job } from '@prisma/client';
import { DatabaseService } from '../services/database';
import { authenticateToken } from '../middleware/auth';


const router = Router();
const db = new DatabaseService();

/**
 * Helper function to add computed fields to job objects
 * Keeps frontend "dumb" by providing pre-formatted data
 */
function addComputedFields(job: Partial<Job> & { 
  relevanceScore?: number | null;
  createdAt?: Date;
  postedDate?: Date | null;
}) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Not specified';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const relevanceScore = job.relevanceScore || 0;
  const relevancePercentage = Math.round(relevanceScore * 100);
  
  return {
    ...job,
    formattedPostedDate: formatDate(job.postedDate),
    formattedCreatedAt: formatDate(job.createdAt),
    relevancePercentage,
    relevanceBadgeVariant: relevancePercentage >= 80 ? 'default' : 'secondary'
  };
}

// Initialize database connection
db.init().catch(console.error);

/**
 * GET /api/v1/jobs - List all jobs with filtering (requires auth)
 * Query parameters:
 * - search: string (search in title, company, description)
 * - company: string (filter by company name)
 * - location: string (filter by location)
 * - remote: boolean (filter by remote status)
 * - minRelevanceScore: number (minimum relevance score)
 * - maxRelevanceScore: number (maximum relevance score)
 * - datePosted: 'today' | 'week' | 'month' | 'all'
 * - untracked: boolean (show only jobs not tracked by current user)
 * - limit: number (page size, max 100)
 * - offset: number (pagination offset)
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string,
      company: req.query.company as string,
      location: req.query.location as string,
      remote: req.query.remote === 'true' ? true : req.query.remote === 'false' ? false : undefined,
      minRelevanceScore: req.query.minRelevanceScore ? parseFloat(req.query.minRelevanceScore as string) : undefined,
      maxRelevanceScore: req.query.maxRelevanceScore ? parseFloat(req.query.maxRelevanceScore as string) : undefined,
      datePosted: req.query.datePosted as 'today' | 'week' | 'month' | 'all' | undefined,
      untracked: req.query.untracked === 'true',
      limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };


    // Build Prisma where clause
    const where: Record<string, unknown> = {};
    
    // Search across multiple fields
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Company filter
    if (filters.company) {
      where.company = { contains: filters.company, mode: 'insensitive' };
    }

    // Location filter
    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    // Remote filter
    if (filters.remote !== undefined) {
      where.isRemote = filters.remote;
    }

    // Relevance score filter
    if (filters.minRelevanceScore !== undefined || filters.maxRelevanceScore !== undefined) {
      where.relevanceScore = {
        ...(filters.minRelevanceScore !== undefined && { gte: filters.minRelevanceScore }),
        ...(filters.maxRelevanceScore !== undefined && { lte: filters.maxRelevanceScore })
      };
    }

    // Date filter
    if (filters.datePosted && filters.datePosted !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.datePosted) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      where.createdAt = { gte: startDate };
    }

    // Untracked filter (exclude jobs already tracked by user)
    if (filters.untracked) {
      const userId = req.user.id;
      where.userJobs = {
        none: {
          userId: userId
        }
      };
    }

    // Get jobs with filters
    const [jobs, total] = await Promise.all([
      db.prisma.client.job.findMany({
        where,
        take: filters.limit,
        skip: filters.offset,
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
      }),
      db.prisma.client.job.count({ where })
    ]);

    // Add computed fields to each job
    const jobsWithComputedFields = jobs.map(addComputedFields);

    res.json({
      success: true,
      data: jobsWithComputedFields,
      meta: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        count: jobs.length,
        filters: filters
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/jobs/:id - Get job details with user tracking status (requires auth)
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.id;
    
    const job = await db.prisma.client.job.findUnique({
      where: { id: jobId },
      include: {
        userJobs: {
          where: { userId: userId },
          include: {
            stage: {
              select: {
                id: true,
                name: true,
                color: true,
                isSystem: true
              }
            }
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Add computed fields to job
    const jobWithComputedFields = addComputedFields(job);

    res.json({
      success: true,
      data: jobWithComputedFields
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/jobs/user/saved - Get user's saved/tracked jobs (requires auth)
 */
router.get('/user/saved', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const stageId = req.query.stageId as string;

    const where: { userId: string; stageId?: number } = { userId };
    if (stageId) {
      where.stageId = parseInt(stageId, 10);
    }

    const [userJobs, total] = await Promise.all([
      db.prisma.client.userJob.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        include: {
          job: {
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
              createdAt: true,
              postedDate: true
            }
          },
          stage: {
            select: {
              id: true,
              name: true,
              color: true,
              isSystem: true
            }
          }
        }
      }),
      db.prisma.client.userJob.count({ where })
    ]);

    // Add computed fields to job data within userJobs
    const userJobsWithComputedFields = userJobs.map(userJob => ({
      ...userJob,
      job: addComputedFields(userJob.job)
    }));

    res.json({
      success: true,
      data: userJobsWithComputedFields,
      meta: {
        total,
        limit,
        offset,
        count: userJobs.length
      }
    });
  } catch (error) {
    console.error('Error fetching user jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user jobs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/jobs/:id/save - Save/track a job (requires auth)
 * Body: { stageId?: string, notes?: string }
 */
router.post('/:id/save', authenticateToken, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.id;
    const { stageId, notes } = req.body;

    // Check if job exists
    const job = await db.prisma.client.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Check if already saved
    const existingUserJob = await db.prisma.client.userJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId
        }
      }
    });

    if (existingUserJob) {
      return res.status(400).json({
        success: false,
        error: 'Job already saved',
        data: existingUserJob
      });
    }

    // Get default stage if none provided
    let targetStageId = stageId;
    if (!targetStageId) {
      const defaultStage = await db.prisma.client.jobStage.findFirst({
        where: { 
          isSystem: true,
          name: 'Interested'
        }
      });
      targetStageId = defaultStage?.id;
    }

    // Create user job tracking
    const userJob = await db.prisma.client.userJob.create({
      data: {
        userId,
        jobId,
        stageId: targetStageId,
        notes,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            relevanceScore: true
          }
        },
        stage: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: userJob,
      message: 'Job saved successfully'
    });
  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v1/jobs/:id/stage - Update job stage (requires auth)
 * Body: { stageId: string, notes?: string }
 */
router.put('/:id/stage', authenticateToken, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.id;
    const { stageId, notes } = req.body;

    if (!stageId) {
      return res.status(400).json({
        success: false,
        error: 'stageId is required'
      });
    }

    // Parse stageId to integer
    const parsedStageId = parseInt(stageId, 10);
    if (isNaN(parsedStageId)) {
      return res.status(400).json({
        success: false,
        error: 'stageId must be a valid number'
      });
    }

    // Update user job stage
    const userJob = await db.prisma.client.userJob.update({
      where: {
        userId_jobId: {
          userId,
          jobId
        }
      },
      data: {
        stageId: parsedStageId,
        notes,
        updatedAt: new Date()
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true
          }
        },
        stage: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: userJob,
      message: 'Job stage updated successfully'
    });
  } catch (error) {
    console.error('Error updating job stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job stage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v1/jobs/:id/unsave - Remove job from user's saved jobs (requires auth)
 */
router.delete('/:id/unsave', authenticateToken, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.id;

    await db.prisma.client.userJob.delete({
      where: {
        userId_jobId: {
          userId,
          jobId
        }
      }
    });

    res.json({
      success: true,
      message: 'Job removed from saved jobs'
    });
  } catch (error) {
    console.error('Error removing saved job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove saved job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;