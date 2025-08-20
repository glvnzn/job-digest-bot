/**
 * Job Stages Management API Routes
 * 
 * Provides endpoints for:
 * - Getting system and user-defined job stages
 * - Creating custom stages
 * - Updating and deleting stages
 * - Reordering stages
 */

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';
import { optionalAuth, authenticateToken } from '../middleware/auth';

const router = Router();
const db = new DatabaseService();

// Initialize database connection
db.init().catch(console.error);

/**
 * GET /api/v1/stages - Get all stages (system + user-defined)
 * Optional authentication - includes user's custom stages if authenticated
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    // Get system stages (always available)
    const systemStages = await db.prisma.client.jobStage.findMany({
      where: { isSystem: true },
      orderBy: { sortOrder: 'asc' }
    });

    // Get user's custom stages if authenticated
    let userStages: any[] = [];
    if (userId) {
      userStages = await db.prisma.client.jobStage.findMany({
        where: { 
          isSystem: false,
          userId: userId
        },
        orderBy: { sortOrder: 'asc' }
      });
    }

    // Combine and sort stages
    const allStages = [...systemStages, ...userStages].sort((a, b) => a.sortOrder - b.sortOrder);

    res.json({
      success: true,
      data: allStages,
      meta: {
        systemStages: systemStages.length,
        userStages: userStages.length,
        total: allStages.length
      }
    });
  } catch (error) {
    console.error('Error fetching stages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job stages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/stages - Create custom stage (requires auth)
 * Body: { name: string, color: string, description?: string, sortOrder?: number }
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { name, color, sortOrder } = req.body;

    if (!name || !color) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, color'
      });
    }

    // Check if stage name already exists for this user
    const existingStage = await db.prisma.client.jobStage.findFirst({
      where: {
        name,
        OR: [
          { isSystem: true },
          { userId: userId }
        ]
      }
    });

    if (existingStage) {
      return res.status(400).json({
        success: false,
        error: 'Stage name already exists'
      });
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxOrder = await db.prisma.client.jobStage.aggregate({
        where: {
          OR: [
            { isSystem: true },
            { userId: userId }
          ]
        },
        _max: { sortOrder: true }
      });
      finalSortOrder = (maxOrder._max.sortOrder || 0) + 1;
    }

    const stage = await db.prisma.client.jobStage.create({
      data: {
        name,
        color,
        sortOrder: finalSortOrder,
        isSystem: false,
        userId
      }
    });

    res.status(201).json({
      success: true,
      data: stage,
      message: 'Custom stage created successfully'
    });
  } catch (error) {
    console.error('Error creating stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v1/stages/:id - Update stage (requires auth, user stages only)
 * Body: { name?: string, color?: string, description?: string, sortOrder?: number }
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stageId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { name, color, description, sortOrder } = req.body;

    // Verify stage exists and belongs to user
    const existingStage = await db.prisma.client.jobStage.findFirst({
      where: {
        id: stageId,
        userId: userId,
        isSystem: false
      }
    });

    if (!existingStage) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found or not editable'
      });
    }

    // Check name uniqueness if changing name
    if (name && name !== existingStage.name) {
      const nameExists = await db.prisma.client.jobStage.findFirst({
        where: {
          name,
          OR: [
            { isSystem: true },
            { userId: userId }
          ],
          NOT: { id: stageId }
        }
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          error: 'Stage name already exists'
        });
      }
    }

    const updatedStage = await db.prisma.client.jobStage.update({
      where: { id: stageId },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder }),
      }
    });

    res.json({
      success: true,
      data: updatedStage,
      message: 'Stage updated successfully'
    });
  } catch (error) {
    console.error('Error updating stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v1/stages/:id - Delete custom stage (requires auth)
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stageId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    // Verify stage exists and belongs to user
    const existingStage = await db.prisma.client.jobStage.findFirst({
      where: {
        id: stageId,
        userId: userId,
        isSystem: false
      }
    });

    if (!existingStage) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found or not deletable'
      });
    }

    // Check if stage is in use
    const jobsUsingStage = await db.prisma.client.userJob.count({
      where: { stageId }
    });

    if (jobsUsingStage > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete stage that is in use',
        meta: { jobsUsingStage }
      });
    }

    await db.prisma.client.jobStage.delete({
      where: { id: stageId }
    });

    res.json({
      success: true,
      message: 'Stage deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete stage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v1/stages/reorder - Reorder stages (requires auth)
 * Body: { stageIds: string[] } - Array of stage IDs in new order
 */
router.put('/reorder', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { stageIds } = req.body;

    if (!Array.isArray(stageIds)) {
      return res.status(400).json({
        success: false,
        error: 'stageIds must be an array'
      });
    }

    // Verify all stages belong to user or are system stages
    const stages = await db.prisma.client.jobStage.findMany({
      where: {
        id: { in: stageIds },
        OR: [
          { isSystem: true },
          { userId: userId }
        ]
      }
    });

    if (stages.length !== stageIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some stages not found or not accessible'
      });
    }

    // Update sort orders
    const updatePromises = stageIds.map((stageId, index) =>
      db.prisma.client.jobStage.update({
        where: { id: stageId },
        data: { sortOrder: index + 1 }
      })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Stages reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering stages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder stages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/stages/:id/jobs - Get jobs in a specific stage (requires auth)
 * Query parameters:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 */
router.get('/:id/jobs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stageId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify stage exists and is accessible
    const stage = await db.prisma.client.jobStage.findFirst({
      where: {
        id: stageId,
        OR: [
          { isSystem: true },
          { userId: userId }
        ]
      }
    });

    if (!stage) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found'
      });
    }

    const [userJobs, total] = await Promise.all([
      db.prisma.client.userJob.findMany({
        where: {
          userId,
          stageId
        },
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
              createdAt: true
            }
          }
        }
      }),
      db.prisma.client.userJob.count({
        where: {
          userId,
          stageId
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        stage,
        jobs: userJobs,
        meta: {
          total,
          limit,
          offset,
          count: userJobs.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stage jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stage jobs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;