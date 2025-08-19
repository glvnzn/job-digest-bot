import { MarketIntelligenceService } from './market-intelligence';
import { PrismaDatabaseService } from './database-prisma';

export class InsightAutomationService {
  private marketIntelligence: MarketIntelligenceService;
  private db: PrismaDatabaseService;

  constructor() {
    this.marketIntelligence = new MarketIntelligenceService();
    this.db = new PrismaDatabaseService();
  }

  async initialize(): Promise<void> {
    await this.marketIntelligence.initialize();
    await this.db.init();
  }

  /**
   * Generates daily market snapshot and updates trends
   * Should be called once per day (e.g., at midnight)
   */
  async generateDailyInsights(): Promise<void> {
    try {
      console.log('🔄 Starting daily insight generation...');

      // Generate market snapshot for today
      await this.marketIntelligence.generateMarketSnapshot();
      
      // Update technology trend calculations
      await this.updateTechnologyTrendCalculations();
      
      // Clean up old data
      await this.cleanupOldData();
      
      console.log('✅ Daily insight generation completed');
      
    } catch (error) {
      console.error('❌ Daily insight generation failed:', error);
      throw error;
    }
  }

  /**
   * Updates technology trend calculations (growth rates, trend status)
   */
  private async updateTechnologyTrendCalculations(): Promise<void> {
    try {
      console.log('📊 Updating technology trend calculations...');

      // Get all technology trends
      const techTrends = await this.db.client.techTrend.findMany({
        include: {
          weeklyStats: {
            orderBy: { weekStart: 'desc' },
            take: 4 // Last 4 weeks
          }
        }
      });

      for (const trend of techTrends) {
        if (trend.weeklyStats.length < 2) continue; // Need at least 2 weeks for comparison

        const [currentWeek, previousWeek] = trend.weeklyStats;
        
        // Calculate growth rate
        const growthRate = previousWeek.jobCount > 0 
          ? ((currentWeek.jobCount - previousWeek.jobCount) / previousWeek.jobCount) * 100
          : 0;

        // Determine trend status
        let trendStatus = 'stable';
        if (growthRate > 20) trendStatus = 'rapidly rising';
        else if (growthRate > 10) trendStatus = 'rising';
        else if (growthRate < -20) trendStatus = 'rapidly falling';
        else if (growthRate < -10) trendStatus = 'falling';
        else if (currentWeek.jobCount < 5) trendStatus = 'emerging';

        // Calculate percentage of total jobs
        const totalJobs = await this.db.client.job.count({
          where: {
            createdAt: {
              gte: currentWeek.weekStart,
              lt: new Date(currentWeek.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
            }
          }
        });

        const percentage = totalJobs > 0 ? (currentWeek.jobCount / totalJobs) * 100 : 0;

        // Update the current week's stats
        await this.db.client.techTrendWeekly.update({
          where: { id: currentWeek.id },
          data: {
            growthRate,
            trendStatus,
            percentage
          }
        });
      }

      console.log(`✅ Updated trend calculations for ${techTrends.length} technologies`);
      
    } catch (error) {
      console.error('❌ Failed to update technology trend calculations:', error);
    }
  }

  /**
   * Cleans up old data to prevent database bloat
   */
  private async cleanupOldData(): Promise<void> {
    try {
      console.log('🧹 Cleaning up old data...');

      // Keep only last 3 months of weekly trend data
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const deletedTrendStats = await this.db.client.techTrendWeekly.deleteMany({
        where: {
          weekStart: {
            lt: threeMonthsAgo
          }
        }
      });

      // Keep only last 6 months of market snapshots
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const deletedSnapshots = await this.db.client.marketSnapshot.deleteMany({
        where: {
          snapshotDate: {
            lt: sixMonthsAgo
          }
        }
      });

      console.log(`✅ Cleanup completed: ${deletedTrendStats.count} trend stats, ${deletedSnapshots.count} snapshots removed`);
      
    } catch (error) {
      console.error('❌ Failed to cleanup old data:', error);
    }
  }

  /**
   * Backfills insights for existing jobs that don't have analysis yet
   * Useful for initial setup or after adding new features
   */
  async backfillJobInsights(limit: number = 100): Promise<void> {
    try {
      console.log(`🔄 Backfilling job insights for up to ${limit} jobs...`);

      // Find jobs without insights
      const jobsWithoutInsights = await this.db.client.job.findMany({
        where: {
          insights: null,
          description: {
            not: null,
            notIn: ['', ' ']
          }
        },
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log(`Found ${jobsWithoutInsights.length} jobs without insights`);

      for (const job of jobsWithoutInsights) {
        try {
          await this.marketIntelligence.analyzeJobDescription(job);
          console.log(`✅ Analyzed job ${job.id} - ${job.title}`);
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Failed to analyze job ${job.id}:`, error);
        }
      }

      console.log(`✅ Backfill completed for ${jobsWithoutInsights.length} jobs`);
      
    } catch (error) {
      console.error('❌ Backfill job insights failed:', error);
      throw error;
    }
  }

  /**
   * Generates user-specific insights for all users
   * Should be called weekly to update personalized recommendations
   */
  async generateUserInsights(): Promise<void> {
    try {
      console.log('👥 Generating user-specific insights...');

      const users = await this.db.client.user.findMany({
        include: {
          userJobs: {
            include: {
              job: {
                include: {
                  insights: true
                }
              }
            }
          }
        }
      });

      for (const user of users) {
        try {
          await this.generateUserInsight(user);
          console.log(`✅ Generated insights for user ${user.id}`);
          
        } catch (error) {
          console.error(`❌ Failed to generate insights for user ${user.id}:`, error);
        }
      }

      console.log(`✅ User insights generated for ${users.length} users`);
      
    } catch (error) {
      console.error('❌ User insights generation failed:', error);
    }
  }

  /**
   * Generates insights for a specific user
   */
  private async generateUserInsight(user: any): Promise<void> {
    try {
      // Analyze user's tracked jobs to understand their skills and interests
      const userTechnologies = new Set<string>();
      const userExperienceLevels: string[] = [];
      
      user.userJobs.forEach((userJob: any) => {
        if (userJob.job.insights?.technologies) {
          const technologies = userJob.job.insights.technologies as any[];
          technologies.forEach((tech: any) => {
            if (tech.confidence > 0.7) {
              userTechnologies.add(tech.name);
            }
          });
        }
        
        if (userJob.job.insights?.experienceLevel) {
          userExperienceLevels.push(userJob.job.insights.experienceLevel);
        }
      });

      // Get market data for comparison
      const marketSnapshot = await this.db.client.marketSnapshot.findFirst({
        orderBy: { snapshotDate: 'desc' }
      });

      // Calculate skill gaps and recommendations
      const skillGaps = await this.calculateUserSkillGaps(Array.from(userTechnologies), marketSnapshot);
      const recommendations = this.generateUserRecommendations(Array.from(userTechnologies), skillGaps);
      const marketPosition = this.calculateMarketPosition(Array.from(userTechnologies), userExperienceLevels, marketSnapshot);

      // Increment version for historical tracking
      const existingInsight = await this.db.client.userInsight.findFirst({
        where: { userId: user.id, isActive: true }
      });

      const newVersion = existingInsight ? existingInsight.version + 1 : 1;

      // Deactivate previous insight
      if (existingInsight) {
        await this.db.client.userInsight.update({
          where: { id: existingInsight.id },
          data: { isActive: false }
        });
      }

      // Create new insight
      await this.db.client.userInsight.create({
        data: {
          userId: user.id,
          currentSkills: Array.from(userTechnologies),
          skillGaps,
          recommendations,
          learningPath: [], // TODO: Generate learning path
          marketPosition,
          competitiveness: this.calculateUserCompetitiveness(Array.from(userTechnologies), marketPosition),
          version: newVersion,
          isActive: true
        }
      });

    } catch (error) {
      console.error(`Failed to generate insight for user ${user.id}:`, error);
    }
  }

  private async calculateUserSkillGaps(userSkills: string[], marketSnapshot: any): Promise<any[]> {
    // Get trending technologies that user doesn't have
    const topTechnologies = marketSnapshot?.topTechnologies || [];
    
    return topTechnologies
      .filter((tech: any) => !userSkills.includes(tech.technology))
      .slice(0, 5) // Top 5 gaps
      .map((tech: any) => ({
        skill: tech.technology,
        priority: tech.percentage > 50 ? 'High' : tech.percentage > 30 ? 'Medium' : 'Low',
        marketDemand: tech.percentage
      }));
  }

  private generateUserRecommendations(userSkills: string[], skillGaps: any[]): any[] {
    const recommendations = [];

    if (skillGaps.length > 0 && skillGaps[0].priority === 'High') {
      recommendations.push({
        type: 'Upskill',
        skill: skillGaps[0].skill,
        priority: 'High',
        reason: `High market demand (${skillGaps[0].marketDemand}% of jobs)`
      });
    }

    if (userSkills.length > 0) {
      recommendations.push({
        type: 'Strengthen',
        skill: userSkills[0], // Most prominent skill
        priority: 'Medium',
        reason: 'Deepen expertise in your strongest area'
      });
    }

    return recommendations;
  }

  private calculateMarketPosition(userSkills: string[], experienceLevels: string[], _marketSnapshot: any): any {
    const skillScore = userSkills.length * 10; // Simple scoring
    const experienceScore = experienceLevels.length > 0 ? 
      { junior: 20, mid: 50, senior: 80, lead: 90, principal: 100 }[experienceLevels[0]] || 50 : 50;

    return {
      skillBreadth: userSkills.length,
      marketAlignment: skillScore,
      overallScore: (skillScore + experienceScore) / 2
    };
  }

  private calculateUserCompetitiveness(userSkills: string[], marketPosition: any): number {
    return Math.min(1.0, marketPosition.overallScore / 100);
  }

  async cleanup(): Promise<void> {
    await this.marketIntelligence.cleanup();
    await this.db.close();
  }
}