import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { InsightsService } from '../services/insights';

const router = express.Router();

/**
 * GET /api/v1/insights/career - Get career development insights
 */
router.get('/career', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    // Use real insights service with actual database data
    const insightsService = new InsightsService();
    await insightsService.initialize();
    
    const insights = await insightsService.generateCareerInsights(userId);
    
    await insightsService.cleanup();

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
  }
});

/**
 * GET /api/v1/insights/tech-trends - Get technology trend analysis
 */
router.get('/tech-trends', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Use real insights service with actual database data
    const insightsService = new InsightsService();
    await insightsService.initialize();
    
    const techTrends = await insightsService.getTechTrends(userId);
    
    await insightsService.cleanup();

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
  }
});

export default router;