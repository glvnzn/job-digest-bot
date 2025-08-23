import { Job, JobInsight, UserJob } from '@prisma/client';

// Interface for technology data from job insights
interface TechnologyData {
  name: string;
  confidence: number;
  category?: string;
}

// Type guard for validating technology data
function isTechnologyData(obj: unknown): obj is TechnologyData {
  return typeof obj === 'object' && 
         obj !== null && 
         typeof (obj as any).name === 'string' && 
         typeof (obj as any).confidence === 'number';
}

// Types for analysis results
export interface TechStackAnalysisResult {
  technology: string;
  frequency: number;
  category: string;
  importance: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
}

export interface SkillGap {
  skill: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  frequency: number;
  reasoning: string;
  learningPath: string;
}

export interface CareerRecommendation {
  type: string;
  title: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  actionItems: string[];
  timeframe: string;
}

export interface MarketTrend {
  trend: string;
  growth: string;
  description: string;
  impact: string;
}

export interface TechTrendResult {
  technology: string;
  mentions: number;
  percentage: number;
  category: string;
  trend: 'stable' | 'rising' | 'emerging' | 'niche';
}

// Input types (what we get from database)
export interface JobWithInsights extends Job {
  insights: JobInsight | null;
}

export interface UserJobWithJob extends UserJob {
  job: JobWithInsights;
}

/**
 * Clean insights analyzer that works with passed data
 * No direct database access - follows the established pattern
 */
export class InsightsAnalyzer {
  
  /**
   * Generates comprehensive career insights from provided data
   */
  generateCareerInsights(
    userJobs: UserJobWithJob[], 
    allJobs: JobWithInsights[]
  ) {
    const totalJobs = allJobs.length;
    
    if (totalJobs === 0) {
      return this.getEmptyStateInsights(userJobs.length);
    }

    // Analyze technology trends
    const techStackAnalysis = this.analyzeTechStack(allJobs);
    
    // Identify skill gaps based on user's tracked jobs vs market
    const skillGaps = this.identifySkillGaps(userJobs, allJobs);
    
    // Generate personalized recommendations
    const recommendations = this.generateRecommendations(userJobs, techStackAnalysis, skillGaps);
    
    // Analyze market trends
    const marketTrends = this.analyzeMarketTrends(allJobs);
    
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
        dataFreshness: 'current' as const
      }
    };
  }

  /**
   * Gets technology trend analysis from provided data
   */
  getTechTrends(allJobs: JobWithInsights[], userTrackedJobsCount: number) {
    if (allJobs.length === 0) {
      return this.getEmptyStateTechTrends(userTrackedJobsCount);
    }

    // Aggregate technology mentions
    const techCounts: Record<string, { count: number; category: string }> = {};
    const totalJobs = allJobs.length;

    allJobs.forEach(job => {
      if (job.insights?.technologies && Array.isArray(job.insights.technologies)) {
        const technologies = job.insights.technologies as unknown as TechnologyData[];
        technologies.forEach((tech: unknown) => {
          if (isTechnologyData(tech) && tech.confidence > 0.6) { // Only count high-confidence mentions
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
      userTrackedJobs: userTrackedJobsCount,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Analyzes tech stack popularity from job insights
   */
  private analyzeTechStack(jobs: JobWithInsights[]): TechStackAnalysisResult[] {
    const techCounts: Record<string, { count: number; category: string }> = {};
    const totalJobs = jobs.length;

    jobs.forEach(job => {
      if (job.insights?.technologies && Array.isArray(job.insights.technologies)) {
        const technologies = job.insights.technologies as unknown as TechnologyData[];
        technologies.forEach((tech: unknown) => {
          if (isTechnologyData(tech) && tech.confidence > 0.7) { // High confidence only
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
          importance: this.getImportanceLevel(frequency),
          description: this.getTechnologyDescription(technology, frequency)
        };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Top 10 technologies
  }

  /**
   * Identifies skill gaps based on user's tracked jobs vs market demand
   */
  private identifySkillGaps(userJobs: UserJobWithJob[], allJobs: JobWithInsights[]): SkillGap[] {
    // Get technologies from user's tracked jobs with improved confidence scoring
    const userTechs = new Map<string, number>();
    const userTechCategories = new Set<string>();
    
    userJobs.forEach(userJob => {
      if (userJob.job?.insights?.technologies && Array.isArray(userJob.job.insights.technologies)) {
        const technologies = userJob.job.insights.technologies as unknown as TechnologyData[];
        technologies.forEach((tech: unknown) => {
          if (isTechnologyData(tech) && tech.confidence > 0.6) { // Slightly lower threshold for user skills
            const normalizedName = tech.name.toLowerCase().trim();
            userTechs.set(normalizedName, (userTechs.get(normalizedName) || 0) + 1);
            if (tech.category) {
              userTechCategories.add(tech.category.toLowerCase());
            }
          }
        });
      }
    });

    // Analyze market demand for all technologies
    const marketTechs: Record<string, { count: number; category: string; avgConfidence: number }> = {};
    const totalJobsWithTech = allJobs.filter(job => {
      const tech = job.insights?.technologies;
      return tech && Array.isArray(tech) && tech.length > 0;
    }).length;
    
    if (totalJobsWithTech === 0) {
      return [];
    }
    
    allJobs.forEach(job => {
      if (job.insights?.technologies && Array.isArray(job.insights.technologies)) {
        const technologies = job.insights.technologies as unknown as TechnologyData[];
        technologies.forEach((tech: unknown) => {
          if (isTechnologyData(tech) && tech.confidence > 0.7) {
            const normalizedName = tech.name.toLowerCase().trim();
            if (!marketTechs[normalizedName]) {
              marketTechs[normalizedName] = {
                count: 0,
                category: tech.category || 'Other',
                avgConfidence: 0
              };
            }
            marketTechs[normalizedName].count++;
            marketTechs[normalizedName].avgConfidence += tech.confidence;
          }
        });
      }
    });

    // Calculate averages and identify gaps
    const skillGaps: SkillGap[] = [];
    
    Object.entries(marketTechs).forEach(([skill, data]) => {
      const normalizedSkill = skill.toLowerCase().trim();
      const userHasSkill = userTechs.has(normalizedSkill);
      
      if (!userHasSkill) {
        const frequency = Math.round((data.count / totalJobsWithTech) * 100);
        const avgConfidence = data.avgConfidence / data.count;
        
        // Enhanced priority calculation
        const priority = this.calculateSkillPriority(frequency, avgConfidence);
        
        // Lowered threshold to show more actionable insights - especially for users with limited data
        const hasLimitedUserData = userTechs.size < 10;
        const minFrequency = hasLimitedUserData ? 8 : 12; // Lower threshold for users with limited data
        
        if (frequency >= minFrequency) {
          skillGaps.push({
            skill: this.capitalizeWords(skill),
            priority,
            frequency,
            reasoning: this.generateGapReasoning(skill, frequency, data.category, userTechCategories),
            learningPath: this.generateEnhancedLearningPath(skill, data.category, priority)
          });
        }
      }
    });

    // If we still have no skill gaps but have market data, add some emerging/complementary technologies
    if (skillGaps.length === 0 && userTechs.size > 0) {
      const complementaryTechs = this.getComplementaryTechnologies(userTechs, marketTechs, totalJobsWithTech);
      skillGaps.push(...complementaryTechs);
    }

    // Sort by priority and frequency
    const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    return skillGaps
      .sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
        if (priorityDiff !== 0) return -priorityDiff;
        return b.frequency - a.frequency;
      })
      .slice(0, 6); // Top 6 skill gaps
  }

  /**
   * Generates personalized career recommendations
   */
  private generateRecommendations(
    userJobs: UserJobWithJob[], 
    techStack: TechStackAnalysisResult[], 
    skillGaps: SkillGap[]
  ): CareerRecommendation[] {
    const recommendations: CareerRecommendation[] = [];

    // High-priority skill gap recommendation
    if (skillGaps.length > 0 && (skillGaps[0].priority === 'High' || skillGaps[0].priority === 'Critical')) {
      recommendations.push({
        type: 'Upskill',
        title: `Master ${skillGaps[0].skill}`,
        priority: skillGaps[0].priority,
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
    const criticalTech = techStack.find(tech => tech.frequency > 60 && tech.importance === 'Critical');
    if (criticalTech) {
      recommendations.push({
        type: 'Strengthen',
        title: `Deepen ${criticalTech.technology} Expertise`,
        priority: 'High',
        description: `${criticalTech.technology} is critical in ${criticalTech.frequency}% of job postings`,
        actionItems: [
          `Take advanced ${criticalTech.technology} courses`,
          `Contribute to ${criticalTech.technology} open source projects`,
          `Build complex applications using ${criticalTech.technology}`
        ],
        timeframe: '3-6 months'
      });
    }

    // Portfolio enhancement recommendation (always relevant)
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
  private analyzeMarketTrends(jobs: JobWithInsights[]): MarketTrend[] {
    const trends: MarketTrend[] = [];
    const totalJobs = jobs.length;

    if (totalJobs === 0) {
      return [{
        trend: 'Insufficient Data',
        growth: 'unknown',
        description: 'Not enough job data for trend analysis',
        impact: 'Unable to determine market trends'
      }];
    }

    // Analyze remote work trend
    const remoteJobs = jobs.filter(job => job.isRemote).length;
    const remotePercentage = Math.round((remoteJobs / totalJobs) * 100);
    
    if (remotePercentage > 30) {
      trends.push({
        trend: 'Remote Work Adoption',
        growth: remotePercentage > 60 ? 'rapidly increasing' : 'increasing',
        description: `${remotePercentage}% of job postings offer remote work options`,
        impact: 'Geographical barriers reduced, global talent competition increased'
      });
    }

    // Analyze experience level trends
    const experienceLevels: Record<string, number> = {};
    jobs.forEach(job => {
      if (job.insights?.experienceLevel) {
        const level = job.insights.experienceLevel;
        experienceLevels[level] = (experienceLevels[level] || 0) + 1;
      }
    });

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

    // If no specific trends found, add a general trend
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
   * Gets complementary technologies when no clear skill gaps exist
   */
  private getComplementaryTechnologies(
    userTechs: Map<string, number>,
    marketTechs: Record<string, { count: number; category: string; avgConfidence: number }>,
    totalJobsWithTech: number
  ): SkillGap[] {
    const complementary: SkillGap[] = [];
    const userTechArray = Array.from(userTechs.keys());
    
    // Define complementary technology mappings
    const complementaryMap: Record<string, string[]> = {
      'react': ['next.js', 'redux', 'tailwind css', 'styled-components', 'graphql'],
      'javascript': ['typescript', 'webpack', 'eslint', 'jest', 'babel'],
      'node.js': ['express', 'mongodb', 'postgresql', 'redis', 'docker'],
      'typescript': ['nest.js', 'prisma', 'graphql', 'apollo', 'rxjs'],
      'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
      'html/css': ['sass', 'tailwind css', 'bootstrap', 'styled-components'],
      'vue': ['nuxt.js', 'vuex', 'quasar', 'vuelidate'],
      'angular': ['rxjs', 'ngrx', 'ionic', 'angular material']
    };

    // Look for complementary technologies based on user's existing skills
    userTechArray.forEach(userTech => {
      const complements = complementaryMap[userTech] || [];
      complements.forEach(complement => {
        if (marketTechs[complement] && !userTechs.has(complement)) {
          const frequency = Math.round((marketTechs[complement].count / totalJobsWithTech) * 100);
          if (frequency >= 5) { // Even lower threshold for complementary tech
            complementary.push({
              skill: this.capitalizeWords(complement),
              priority: 'Medium',
              frequency,
              reasoning: `Complementary to your ${this.capitalizeWords(userTech)} skills. Found in ${frequency}% of job postings.`,
              learningPath: this.generateEnhancedLearningPath(complement, marketTechs[complement].category, 'Medium')
            });
          }
        }
      });
    });

    // If still no complementary techs, suggest some general emerging technologies
    if (complementary.length === 0) {
      const emergingTechs = ['docker', 'kubernetes', 'aws', 'typescript', 'graphql', 'next.js', 'tailwind css'];
      emergingTechs.forEach(tech => {
        if (marketTechs[tech] && !userTechs.has(tech)) {
          const frequency = Math.round((marketTechs[tech].count / totalJobsWithTech) * 100);
          if (frequency >= 3) { // Very low threshold for emerging tech
            complementary.push({
              skill: this.capitalizeWords(tech),
              priority: 'Low',
              frequency,
              reasoning: `Emerging technology appearing in ${frequency}% of job postings. Could enhance your skill portfolio.`,
              learningPath: this.generateEnhancedLearningPath(tech, marketTechs[tech].category, 'Low')
            });
          }
        }
      });
    }

    return complementary.slice(0, 3); // Max 3 complementary technologies
  }

  /**
   * Helper methods
   */
  private getImportanceLevel(frequency: number): 'Critical' | 'High' | 'Medium' | 'Low' {
    if (frequency > 70) return 'Critical';
    if (frequency > 50) return 'High';
    if (frequency > 30) return 'Medium';
    return 'Low';
  }

  private calculateSkillPriority(frequency: number, avgConfidence: number): 'Critical' | 'High' | 'Medium' | 'Low' {
    if (frequency > 60 && avgConfidence > 0.8) return 'Critical';
    if (frequency > 40 || (frequency > 25 && avgConfidence > 0.85)) return 'High';
    if (frequency > 20) return 'Medium';
    return 'Low';
  }

  private calculateTrend(mentions: number, totalJobs: number): 'stable' | 'rising' | 'emerging' | 'niche' {
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

  private generateGapReasoning(skill: string, frequency: number, category: string, userCategories: Set<string>): string {
    const isInUserCategory = userCategories.has(category.toLowerCase());
    
    if (frequency > 60) {
      return `Critical technology appearing in ${frequency}% of positions${isInUserCategory ? ' in your focus area' : ''}`;
    } else if (frequency > 40) {
      return `High-demand skill found in ${frequency}% of job postings${isInUserCategory ? ', expanding your existing expertise' : ''}`;
    } else if (frequency > 25) {
      return `Emerging technology in ${frequency}% of positions, growing market demand`;
    } else {
      return `Specialized skill in ${frequency}% of roles, valuable for career differentiation`;
    }
  }

  private generateEnhancedLearningPath(skill: string, category: string, priority: string): string {
    const skillLower = skill.toLowerCase();
    
    // Specific technology paths
    const specificPaths: Record<string, string> = {
      'kubernetes': '1. Master Docker fundamentals 2. Complete K8s certification (CKA) 3. Build production-ready deployments',
      'docker': '1. Learn containerization concepts 2. Master Dockerfile best practices 3. Implement CI/CD with containers',
      'typescript': '1. Strengthen JavaScript foundations 2. Learn TS type system 3. Build large-scale applications',
      'graphql': '1. Understand REST vs GraphQL 2. Learn Apollo/Relay 3. Design efficient schemas',
      'aws': '1. Complete AWS Cloud Practitioner 2. Focus on core services (EC2, S3, Lambda) 3. Pursue Solutions Architect certification',
      'azure': '1. Learn cloud fundamentals 2. Complete AZ-900 certification 3. Specialize in relevant services',
      'react': '1. Master modern React patterns 2. Learn state management (Redux/Zustand) 3. Build performance-optimized apps',
      'vue': '1. Learn Vue 3 composition API 2. Master Nuxt.js framework 3. Build full-stack applications',
      'angular': '1. Learn TypeScript first 2. Master Angular CLI and services 3. Build enterprise applications',
      'node.js': '1. Master async programming 2. Learn Express/Fastify 3. Build scalable microservices',
      'python': '1. Learn syntax and core libraries 2. Master frameworks (Django/FastAPI) 3. Build data/ML applications',
      'golang': '1. Learn Go fundamentals 2. Master concurrency patterns 3. Build high-performance services',
      'rust': '1. Learn ownership and borrowing 2. Master async programming 3. Build systems-level applications'
    };

    if (specificPaths[skillLower]) {
      return specificPaths[skillLower];
    }

    // Category-based paths
    switch (category.toLowerCase()) {
      case 'frontend framework':
      case 'frontend':
        return `1. Learn ${skill} fundamentals 2. Build responsive applications 3. Master component patterns and state management`;
      case 'backend framework':
      case 'backend':
        return `1. Understand ${skill} architecture 2. Build RESTful APIs 3. Implement authentication and security`;
      case 'database':
        return `1. Learn ${skill} fundamentals 2. Master query optimization 3. Design scalable database schemas`;
      case 'cloud platform':
      case 'devops':
        return `1. Complete ${skill} certification 2. Practice infrastructure as code 3. Implement CI/CD pipelines`;
      case 'programming language':
        return `1. Master ${skill} syntax and idioms 2. Learn ecosystem and frameworks 3. Build production applications`;
      default: {
        const timeframe = priority === 'Critical' ? '2-4 weeks' : priority === 'High' ? '1-2 months' : '2-3 months';
        return `1. Learn ${skill} fundamentals 2. Complete hands-on projects 3. Gain production experience (${timeframe})`;
      }
    }
  }

  private generatePreparationAdvice(skillGaps: SkillGap[], techStack: TechStackAnalysisResult[]) {
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

  private capitalizeWords(str: string): string {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Fallback for when no data is available
   */
  private getEmptyStateInsights(trackedJobs: number) {
    return {
      techStackAnalysis: [],
      skillGaps: [],
      recommendations: [],
      marketTrends: [],
      preparationAdvice: {
        immediate: ['Track more jobs to get personalized insights'],
        shortTerm: ['Build a diverse portfolio of projects'],
        longTerm: ['Focus on continuous learning and skill development']
      },
      metadata: {
        analyzedJobs: 0,
        trackedJobs,
        generatedAt: new Date().toISOString(),
        dataFreshness: 'current' as const
      }
    };
  }

  private getEmptyStateTechTrends(userTrackedJobs: number) {
    return {
      trendingTechnologies: [],
      totalJobsAnalyzed: 0,
      userTrackedJobs,
      lastUpdated: new Date().toISOString()
    };
  }
}