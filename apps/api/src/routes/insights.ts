import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { PrismaDatabaseService } from '../services/database-prisma';
import { InsightsAnalyzer } from '../services/insights-analyzer';

const router = express.Router();

/**
 * GET /api/v1/insights/career - Get career development insights
 */
router.get('/career', authenticateToken, async (req: Request, res: Response) => {
  const db = new PrismaDatabaseService();
  
  try {
    const userId = req.user.id;
    await db.init();

    // Fetch user's tracked jobs
    const userJobs = await db.client.userJob.findMany({
      where: { userId },
      include: {
        job: {
          include: {
            insights: true
          }
        }
      }
    });

    // Fetch market data (recent jobs with insights)
    const allJobs = await db.client.job.findMany({
      where: {
        insights: {
          isNot: null
        },
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      },
      include: {
        insights: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000 // Analyze up to 1000 recent jobs
    });

    // Use the clean analyzer
    const analyzer = new InsightsAnalyzer();
    const insights = analyzer.generateCareerInsights(userJobs, allJobs);

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Error generating career insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate career insights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await db.close();
  }
});

/**
 * GET /api/v1/insights/tech-trends - Get technology trend analysis
 */
router.get('/tech-trends', authenticateToken, async (req: Request, res: Response) => {
  const db = new PrismaDatabaseService();
  
  try {
    const userId = req.user.id;
    await db.init();

    // Get user's tracked job count
    const userTrackedJobsCount = await db.client.userJob.count({
      where: { userId }
    });

    // Fetch recent jobs with insights for trend analysis
    const allJobs = await db.client.job.findMany({
      where: {
        insights: {
          isNot: null
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days for trends
        }
      },
      include: {
        insights: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 500 // Analyze up to 500 recent jobs for trends
    });

    // Use the clean analyzer
    const analyzer = new InsightsAnalyzer();
    const techTrends = analyzer.getTechTrends(allJobs, userTrackedJobsCount);

    res.json({
      success: true,
      data: techTrends
    });

  } catch (error) {
    console.error('Error analyzing tech trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze tech trends',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await db.close();
  }
});

export default router;