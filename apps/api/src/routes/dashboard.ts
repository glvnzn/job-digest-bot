/**
 * Dashboard Analytics API Routes
 * 
 * Provides endpoints for:
 * - User dashboard statistics
 * - Application timeline and progress
 * - Weekly/monthly reports
 * - Company and job source analytics
 */

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const db = new DatabaseService();

// Initialize database connection
db.init().catch(console.error);

/**
 * GET /api/v1/dashboard/stats - Get user dashboard statistics (requires auth)
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Get current date ranges
    const now = new Date();
    const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonthStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1);

    // Parallel queries for efficiency
    const [
      totalJobs,
      totalSavedJobs,
      jobsByStage,
      recentActivity,
      thisWeekSaved,
      lastWeekSaved,
      thisMonthSaved,
      lastMonthSaved,
      topCompanies,
      averageRelevanceScore
    ] = await Promise.all([
      // Total jobs available
      db.prisma.client.job.count(),
      
      // Total saved jobs by user
      db.prisma.client.userJob.count({
        where: { userId }
      }),
      
      // Jobs by stage
      (async () => {
        const userJobs = await db.prisma.client.userJob.findMany({
          where: { userId },
          select: { stageId: true }
        });
        
        const stageGroups = userJobs.reduce((acc: any, uj) => {
          const key = uj.stageId;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        
        return Object.entries(stageGroups).map(([stageId, count]) => ({
          stageId: parseInt(stageId, 10),
          _count: { _all: count }
        })).sort((a: any, b: any) => b._count._all - a._count._all);
      })(),
      
      // Recent activity (last 7 days)
      db.prisma.client.userJob.findMany({
        where: {
          userId,
          updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
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
              name: true,
              color: true
            }
          }
        }
      }),
      
      // This week saved jobs
      db.prisma.client.userJob.count({
        where: {
          userId,
          createdAt: { gte: thisWeekStart }
        }
      }),
      
      // Last week saved jobs
      db.prisma.client.userJob.count({
        where: {
          userId,
          createdAt: { 
            gte: lastWeekStart,
            lt: thisWeekStart
          }
        }
      }),
      
      // This month saved jobs
      db.prisma.client.userJob.count({
        where: {
          userId,
          createdAt: { gte: thisMonthStart }
        }
      }),
      
      // Last month saved jobs
      db.prisma.client.userJob.count({
        where: {
          userId,
          createdAt: { 
            gte: lastMonthStart,
            lt: thisMonthStart
          }
        }
      }),
      
      // Top companies user is interested in
      (async () => {
        const userJobs = await db.prisma.client.userJob.findMany({
          where: { userId },
          include: { job: { select: { company: true } } }
        });
        
        const companyCount = userJobs.reduce((acc: any, uj) => {
          const company = uj.job.company;
          acc[company] = (acc[company] || 0) + 1;
          return acc;
        }, {});
        
        return Object.entries(companyCount).map(([company, count]) => ({
          company, count
        })).sort((a: any, b: any) => b.count - a.count).slice(0, 5);
      })(),
      
      // Average relevance score of saved jobs
      (async () => {
        const userJobs = await db.prisma.client.userJob.findMany({
          where: { userId },
          include: { job: { select: { relevanceScore: true } } }
        });
        const scores = userJobs.map(uj => uj.job.relevanceScore).filter(score => score !== null);
        return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      })()
    ]);

    // Get stage names for jobsByStage
    const stageIds = jobsByStage.map(item => item.stageId).filter(Boolean);
    const stages = await db.prisma.client.jobStage.findMany({
      where: { id: { in: stageIds } },
      select: { id: true, name: true, color: true }
    });

    const jobsByStageWithNames = jobsByStage.map(item => {
      const stage = stages.find(s => s.id === item.stageId);
      return {
        stage: stage || { id: item.stageId, name: 'Unknown', color: '#gray' },
        count: item._count._all
      };
    });

    // Calculate growth percentages
    const weeklyGrowth = lastWeekSaved > 0 
      ? ((thisWeekSaved - lastWeekSaved) / lastWeekSaved) * 100 
      : thisWeekSaved > 0 ? 100 : 0;
      
    const monthlyGrowth = lastMonthSaved > 0 
      ? ((thisMonthSaved - lastMonthSaved) / lastMonthSaved) * 100 
      : thisMonthSaved > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalJobsAvailable: totalJobs,
          totalSavedJobs,
          averageRelevanceScore: Math.round(averageRelevanceScore * 10) / 10
        },
        activity: {
          thisWeek: {
            saved: thisWeekSaved,
            growth: Math.round(weeklyGrowth * 10) / 10
          },
          thisMonth: {
            saved: thisMonthSaved,
            growth: Math.round(monthlyGrowth * 10) / 10
          }
        },
        pipeline: {
          stages: jobsByStageWithNames
        },
        recentActivity,
        topCompanies
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/dashboard/timeline - Get user application timeline (requires auth)
 * Query parameters:
 * - period: 'week' | 'month' | 'quarter' | 'year' (default: 'month')
 */
router.get('/timeline', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const period = req.query.period as string || 'month';
    
    let startDate: Date;
    let groupByFormat: string;
    
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupByFormat = 'day';
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupByFormat = 'week';
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupByFormat = 'month';
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupByFormat = 'day';
    }

    // Get user jobs within the time period
    const userJobs = await db.prisma.client.userJob.findMany({
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group data by time period
    // const timelineData: any[] = [];
    const dataMap = new Map();

    userJobs.forEach(userJob => {
      let key: string;
      const date = userJob.createdAt;
      
      switch (groupByFormat) {
        case 'day':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week': {
          const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!dataMap.has(key)) {
        dataMap.set(key, { period: key, saved: 0, updated: 0 });
      }
      
      dataMap.get(key).saved++;
      
      // Check if also updated on same day
      if (userJob.updatedAt.toDateString() === date.toDateString()) {
        dataMap.get(key).updated++;
      }
    });

    // Convert map to array and sort
    const timeline = Array.from(dataMap.values()).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      success: true,
      data: {
        period,
        timeline,
        summary: {
          totalSaved: userJobs.length,
          averagePerPeriod: timeline.length > 0 ? Math.round(userJobs.length / timeline.length * 10) / 10 : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timeline data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/dashboard/analytics - Get detailed analytics (requires auth)
 */
router.get('/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Get comprehensive analytics
    const [
      relevanceDistribution,
      locationDistribution,
      remoteVsOnsite,
      applicationProgress,
      monthlyTrends
    ] = await Promise.all([
      // Relevance score distribution
      db.prisma.client.userJob.findMany({
        where: { userId },
        include: { job: { select: { relevanceScore: true } } }
      }).then(jobs => {
        const scores = jobs.map(j => j.job.relevanceScore);
        const distribution = {
          '90-100': 0,
          '80-89': 0,
          '70-79': 0,
          '60-69': 0,
          'below-60': 0
        };
        
        scores.forEach(score => {
          if (score >= 90) distribution['90-100']++;
          else if (score >= 80) distribution['80-89']++;
          else if (score >= 70) distribution['70-79']++;
          else if (score >= 60) distribution['60-69']++;
          else distribution['below-60']++;
        });
        
        return distribution;
      }),
      
      // Location distribution
      db.prisma.client.userJob.findMany({
        where: { userId },
        include: { job: { select: { location: true } } }
      }).then(jobs => {
        const locations = jobs.map(j => j.job.location);
        const distribution: any = {};
        
        locations.forEach(location => {
          if (location) {
            distribution[location] = (distribution[location] || 0) + 1;
          }
        });
        
        return Object.entries(distribution)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([location, count]) => ({ location, count }));
      }),
      
      // Remote vs onsite
      db.prisma.client.userJob.findMany({
        where: { userId },
        include: { job: { select: { isRemote: true } } }
      }).then(jobs => {
        const remote = jobs.filter(j => j.job.isRemote).length;
        const onsite = jobs.length - remote;
        return { remote, onsite, total: jobs.length };
      }),
      
      // Application progress through stages
      db.prisma.client.userJob.groupBy({
        by: ['stageId'],
        where: { userId },
        _count: { _all: true }
      }).then(async (grouped) => {
        const stageIds = grouped.map(g => g.stageId).filter(Boolean);
        const stages = await db.prisma.client.jobStage.findMany({
          where: { id: { in: stageIds } },
          select: { id: true, name: true, sortOrder: true }
        });
        
        return grouped.map(g => {
          const stage = stages.find(s => s.id === g.stageId);
          return {
            stage: stage?.name || 'Unknown',
            count: g._count._all,
            sortOrder: stage?.sortOrder || 999
          };
        }).sort((a, b) => a.sortOrder - b.sortOrder);
      }),
      
      // Monthly trends (last 6 months)
      db.prisma.client.userJob.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
        },
        select: { createdAt: true }
      }).then(jobs => {
        const months: any = {};
        
        jobs.forEach(job => {
          const month = `${job.createdAt.getFullYear()}-${String(job.createdAt.getMonth() + 1).padStart(2, '0')}`;
          months[month] = (months[month] || 0) + 1;
        });
        
        return Object.entries(months)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, count]) => ({ month, count }));
      })
    ]);

    res.json({
      success: true,
      data: {
        relevanceDistribution,
        locationDistribution,
        remoteVsOnsite,
        applicationProgress,
        monthlyTrends
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;