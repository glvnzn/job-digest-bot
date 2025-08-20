import { PrismaDatabaseService } from './database-prisma';

interface TechStackAnalysisResult {
  technology: string;
  frequency: number;
  category: string;
  importance: string;
  description: string;
}

interface SkillGap {
  skill: string;
  priority: string;
  frequency: number;
  reasoning: string;
  learningPath: string;
}

interface CareerRecommendation {
  type: string;
  title: string;
  priority: string;
  description: string;
  actionItems: string[];
  timeframe: string;
}

interface MarketTrend {
  trend: string;
  growth: string;
  description: string;
  impact: string;
}

interface TechTrendResult {
  technology: string;
  mentions: number;
  percentage: number;
  category: string;
  trend: string;
}

export class InsightsService {
  private db: PrismaDatabaseService;

  constructor() {
    this.db = new PrismaDatabaseService();
  }

  async initialize(): Promise<void> {
    await this.db.init();
  }

  /**
   * Generates comprehensive career insights based on actual job data
   */
  async generateCareerInsights(userId: string): Promise<any> {
    try {
      // Get user's tracked jobs to understand their interests
      const userJobs = await this.db.client.userJob.findMany({
        where: { userId },
        include: {
          job: {
            include: {
              insights: true
            }
          }
        }
      });

      // Get all jobs with insights for market analysis
      const allJobs = await this.db.client.job.findMany({
        where: {
          insights: {
            isNot: null
          }
        },
        include: {
          insights: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 500 // Analyze recent 500 jobs
      });

      const totalJobs = allJobs.length;
      
      if (totalJobs === 0) {
        // Return mock data if no real data available
        return this.getMockInsights(userJobs.length);
      }

      // Analyze technology trends
      const techStackAnalysis = await this.analyzeTechStack(allJobs);
      
      // Identify skill gaps based on user's tracked jobs vs market
      const skillGaps = await this.identifySkillGaps(userJobs, allJobs);
      
      // Generate personalized recommendations
      const recommendations = await this.generateRecommendations(userJobs, techStackAnalysis, skillGaps);
      
      // Analyze market trends
      const marketTrends = await this.analyzeMarketTrends(allJobs);
      
      return {
        techStackAnalysis,
        skillGaps,
        recommendations,
        marketTrends,
        preparationAdvice: this.generatePreparationAdvice(skillGaps, techStackAnalysis),
        metadata: {
          analyzedJobs: totalJobs,
          trackedJobs: userJobs.length,
          generatedAt: new Date().toISOString(),
          dataFreshness: 'current'
        }
      };

    } catch (error) {
      console.error('Error generating career insights:', error);
      // Return mock data on error
      return this.getMockInsights(0);
    }
  }

  /**
   * Gets technology trend analysis from real database data
   */
  async getTechTrends(userId: string): Promise<any> {
    try {
      // Get all jobs with insights for trend analysis
      const allJobs = await this.db.client.job.findMany({
        where: {
          insights: {
            isNot: null
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        include: {
          insights: true
        }
      });

      const userJobs = await this.db.client.userJob.count({
        where: { userId }
      });

      if (allJobs.length === 0) {
        return this.getMockTechTrends(userJobs);
      }

      // Aggregate technology mentions
      const techCounts: Record<string, { count: number; category: string }> = {};
      const totalJobs = allJobs.length;

      allJobs.forEach(job => {
        if (job.insights?.technologies) {
          const technologies = job.insights.technologies as any[];
          technologies.forEach((tech: any) => {
            if (tech.confidence > 0.6) { // Only count high-confidence mentions
              if (!techCounts[tech.name]) {
                techCounts[tech.name] = { count: 0, category: tech.category || 'Other' };
              }
              techCounts[tech.name].count++;
            }
          });
        }
      });

      // Convert to trending technologies format
      const trendingTechnologies: TechTrendResult[] = Object.entries(techCounts)
        .map(([technology, data]) => ({
          technology,
          mentions: data.count,
          percentage: Math.round((data.count / totalJobs) * 100),
          category: data.category,
          trend: this.calculateTrend(data.count, totalJobs)
        }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 20); // Top 20 technologies

      return {
        trendingTechnologies,
        totalJobsAnalyzed: totalJobs,
        userTrackedJobs: userJobs,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error analyzing tech trends:', error);
      return this.getMockTechTrends(0);
    }
  }

  /**
   * Analyzes tech stack popularity from job insights
   */
  private async analyzeTechStack(jobs: any[]): Promise<TechStackAnalysisResult[]> {
    const techCounts: Record<string, { count: number; category: string }> = {};
    const totalJobs = jobs.length;

    jobs.forEach(job => {
      if (job.insights?.technologies) {
        const technologies = job.insights.technologies as any[];
        technologies.forEach((tech: any) => {
          if (tech.confidence > 0.7) { // High confidence only
            if (!techCounts[tech.name]) {
              techCounts[tech.name] = { count: 0, category: tech.category || 'Other' };
            }
            techCounts[tech.name].count++;
          }
        });
      }
    });

    return Object.entries(techCounts)
      .map(([technology, data]) => {
        const frequency = Math.round((data.count / totalJobs) * 100);
        return {
          technology,
          frequency,
          category: data.category,
          importance: frequency > 70 ? 'Critical' : frequency > 50 ? 'High' : frequency > 30 ? 'Medium' : 'Low',
          description: this.getTechnologyDescription(technology, frequency)
        };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Top 10 technologies
  }

  /**
   * Identifies skill gaps based on user's tracked jobs vs market demand
   */
  private async identifySkillGaps(userJobs: any[], allJobs: any[]): Promise<SkillGap[]> {
    // Get technologies from user's tracked jobs
    const userTechs = new Set<string>();
    userJobs.forEach(userJob => {
      if (userJob.job.insights?.technologies) {
        const technologies = userJob.job.insights.technologies as any[];
        technologies.forEach((tech: any) => {
          if (tech.confidence > 0.7) {
            userTechs.add(tech.name);
          }
        });
      }
    });

    // Analyze market demand for technologies not in user's skillset
    const marketTechs: Record<string, number> = {};
    allJobs.forEach(job => {
      if (job.insights?.technologies) {
        const technologies = job.insights.technologies as any[];
        technologies.forEach((tech: any) => {
          if (tech.confidence > 0.7 && !userTechs.has(tech.name)) {
            marketTechs[tech.name] = (marketTechs[tech.name] || 0) + 1;
          }
        });
      }
    });

    const totalJobs = allJobs.length;
    
    return Object.entries(marketTechs)
      .map(([skill, count]) => {
        const frequency = Math.round((count / totalJobs) * 100);
        return {
          skill,
          priority: frequency > 50 ? 'High' : frequency > 30 ? 'Medium' : 'Low',
          frequency,
          reasoning: `Appears in ${frequency}% of job postings but not in your tracked jobs`,
          learningPath: this.generateLearningPath(skill)
        };
      })
      .filter(gap => gap.frequency > 20) // Only significant gaps
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // Top 5 skill gaps
  }

  /**
   * Generates personalized career recommendations
   */
  private async generateRecommendations(userJobs: any[], techStack: TechStackAnalysisResult[], skillGaps: SkillGap[]): Promise<CareerRecommendation[]> {
    const recommendations: CareerRecommendation[] = [];

    // High-priority skill gap recommendation
    if (skillGaps.length > 0 && skillGaps[0].priority === 'High') {
      recommendations.push({
        type: 'Upskill',
        title: `Master ${skillGaps[0].skill}`,
        priority: 'High',
        description: `${skillGaps[0].skill} appears in ${skillGaps[0].frequency}% of job postings and could significantly boost your marketability`,
        actionItems: [
          `Learn ${skillGaps[0].skill} fundamentals`,
          `Build a project showcasing ${skillGaps[0].skill}`,
          `Add ${skillGaps[0].skill} to your resume and portfolio`
        ],
        timeframe: '2-3 months'
      });
    }

    // Technology trend recommendation
    const trendingTech = techStack.find(tech => tech.frequency > 60 && tech.importance === 'Critical');
    if (trendingTech) {
      recommendations.push({
        type: 'Strengthen',
        title: `Deepen ${trendingTech.technology} Expertise`,
        priority: 'High',
        description: `${trendingTech.technology} is critical in ${trendingTech.frequency}% of job postings`,
        actionItems: [
          `Take advanced ${trendingTech.technology} courses`,
          `Contribute to ${trendingTech.technology} open source projects`,
          `Build complex applications using ${trendingTech.technology}`
        ],
        timeframe: '3-6 months'
      });
    }

    // Portfolio enhancement recommendation
    recommendations.push({
      type: 'Improve',
      title: 'Build a Comprehensive Portfolio',
      priority: 'Medium',
      description: 'Showcase your skills with projects that demonstrate real-world problem solving',
      actionItems: [
        'Create 3-5 polished projects covering different aspects of development',
        'Include projects that use the most in-demand technologies',
        'Document your projects with clear READMEs and live demos'
      ],
      timeframe: '1-2 months'
    });

    return recommendations.slice(0, 3); // Top 3 recommendations
  }

  /**
   * Analyzes market trends from job data
   */
  private async analyzeMarketTrends(jobs: any[]): Promise<MarketTrend[]> {
    // Analyze experience level distribution
    const experienceLevels: Record<string, number> = {};
    const remoteJobs = jobs.filter(job => job.isRemote).length;
    const totalJobs = jobs.length;

    jobs.forEach(job => {
      if (job.insights?.experienceLevel) {
        const level = job.insights.experienceLevel;
        experienceLevels[level] = (experienceLevels[level] || 0) + 1;
      }
    });

    const trends: MarketTrend[] = [];

    // Remote work trend
    const remotePercentage = Math.round((remoteJobs / totalJobs) * 100);
    if (remotePercentage > 30) {
      trends.push({
        trend: 'Remote Work Adoption',
        growth: remotePercentage > 60 ? 'rapidly increasing' : 'increasing',
        description: `${remotePercentage}% of job postings offer remote work options`,
        impact: 'Geographical barriers reduced, global talent competition increased'
      });
    }

    // Experience level trends
    const seniorJobs = (experienceLevels.senior || 0) + (experienceLevels.lead || 0) + (experienceLevels.principal || 0);
    const seniorPercentage = Math.round((seniorJobs / totalJobs) * 100);
    
    if (seniorPercentage > 40) {
      trends.push({
        trend: 'Senior Talent Demand',
        growth: 'increasing',
        description: `${seniorPercentage}% of positions target senior-level professionals`,
        impact: 'Strong demand for experienced developers, focus on leadership and architecture skills'
      });
    }

    // Default trend if no specific patterns found
    if (trends.length === 0) {
      trends.push({
        trend: 'Technology Evolution',
        growth: 'continuous',
        description: 'Constant evolution in technology stack requirements',
        impact: 'Need for continuous learning and adaptation to new technologies'
      });
    }

    return trends;
  }

  /**
   * Generates preparation advice based on analysis
   */
  private generatePreparationAdvice(skillGaps: SkillGap[], techStack: TechStackAnalysisResult[]): any {
    const immediate = [
      'Update resume to highlight modern tech stack experience',
      'Create portfolio showcasing best practices and clean code',
      'Optimize LinkedIn profile with relevant keywords'
    ];

    const shortTerm = [
      'Practice coding interviews and system design problems',
      'Build full-stack project with CI/CD pipeline'
    ];

    const longTerm = [
      'Contribute to major open source projects',
      'Build thought leadership through blogging or speaking'
    ];

    // Add skill-specific advice
    if (skillGaps.length > 0) {
      shortTerm.unshift(`Learn ${skillGaps[0].skill} to address major skill gap`);
    }

    if (techStack.length > 0) {
      immediate.push(`Showcase ${techStack[0].technology} projects prominently`);
    }

    return {
      immediate,
      shortTerm,
      longTerm
    };
  }

  /**
   * Helper methods
   */
  private calculateTrend(mentions: number, totalJobs: number): string {
    const percentage = (mentions / totalJobs) * 100;
    if (percentage > 70) return 'stable';
    if (percentage > 50) return 'rising';
    if (percentage > 30) return 'emerging';
    return 'niche';
  }

  private getTechnologyDescription(technology: string, frequency: number): string {
    const descriptions: Record<string, string> = {
      'React': `Frontend framework appearing in ${frequency}% of job postings`,
      'TypeScript': `Type-safe JavaScript variant used in ${frequency}% of positions`,
      'Node.js': `JavaScript runtime for backend development in ${frequency}% of jobs`,
      'Docker': `Containerization technology mentioned in ${frequency}% of postings`,
      'AWS': `Cloud platform referenced in ${frequency}% of job requirements`
    };
    
    return descriptions[technology] || `Technology mentioned in ${frequency}% of job postings`;
  }

  private generateLearningPath(skill: string): string {
    const paths: Record<string, string> = {
      'Kubernetes': 'Start with Docker mastery, then K8s fundamentals and certification',
      'GraphQL': 'Learn GraphQL basics, Apollo Client, and schema design',
      'TypeScript': 'Master JavaScript first, then TypeScript fundamentals and advanced types',
      'Docker': 'Learn containerization basics, Dockerfile creation, and orchestration',
      'AWS': 'Start with core services (EC2, S3, RDS), then pursue certification'
    };
    
    return paths[skill] || `Learn ${skill} fundamentals, build projects, and gain hands-on experience`;
  }

  /**
   * Fallback mock data methods
   */
  private getMockInsights(trackedJobs: number): any {
    return {
      techStackAnalysis: [
        {
          technology: "React",
          frequency: 85,
          category: "Frontend Framework",
          importance: "Critical",
          description: "Most requested frontend framework across job postings"
        }
      ],
      skillGaps: [
        {
          skill: "Kubernetes",
          priority: "High",
          frequency: 58,
          reasoning: "Container orchestration appears in 58% of senior positions",
          learningPath: "Start with Docker mastery, then K8s fundamentals and certification"
        }
      ],
      recommendations: [
        {
          type: "Upskill",
          title: "Master Cloud Architecture",
          priority: "High",
          description: "Cloud-native development is becoming the standard",
          actionItems: ["Complete AWS certification", "Build microservices project"],
          timeframe: "3-6 months"
        }
      ],
      marketTrends: [
        {
          trend: "AI-First Development",
          growth: "rapidly increasing",
          description: "Companies integrating AI into core products",
          impact: "High demand for AI integration skills"
        }
      ],
      preparationAdvice: {
        immediate: ["Update resume", "Create portfolio"],
        shortTerm: ["Learn TypeScript", "Build projects"],
        longTerm: ["Get certified", "Build thought leadership"]
      },
      metadata: {
        analyzedJobs: 0,
        trackedJobs,
        generatedAt: new Date().toISOString(),
        dataFreshness: 'mock'
      }
    };
  }

  private getMockTechTrends(userTrackedJobs: number): any {
    return {
      trendingTechnologies: [
        {
          technology: "React",
          mentions: 245,
          percentage: 85,
          category: "Frontend Framework",
          trend: "stable"
        }
      ],
      totalJobsAnalyzed: 0,
      userTrackedJobs,
      lastUpdated: new Date().toISOString()
    };
  }

  async cleanup(): Promise<void> {
    await this.db.close();
  }
}