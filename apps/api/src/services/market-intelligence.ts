import { OpenAIService } from './openai';
import { PrismaDatabaseService } from './database-prisma';
import { JobListing } from '../models/types';

interface TechStackAnalysis {
  technologies: Array<{
    name: string;
    category: string;
    confidence: number;
    context?: string;
  }>;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'principal';
  skillRequirements: {
    required: string[];
    preferred: string[];
    niceToHave: string[];
  };
  salaryRange?: {
    min?: number;
    max?: number;
    currency: string;
  };
  benefits: string[];
  responsibilities: string[];
}

export class MarketIntelligenceService {
  private openai: OpenAIService;
  private db: PrismaDatabaseService;

  constructor() {
    this.openai = new OpenAIService();
    this.db = new PrismaDatabaseService();
  }

  async initialize(): Promise<void> {
    await this.db.init();
  }

  /**
   * Analyzes a job description and creates market intelligence insights
   */
  async analyzeJobDescription(job: JobListing, jobDescription?: string): Promise<void> {
    try {
      console.log(`🔍 Analyzing job description for: ${job.title} at ${job.company}`);

      // Use the job description or fetch from URL if not provided
      let fullDescription = jobDescription || job.description || '';
      
      if (!fullDescription && job.applyUrl) {
        console.log(`📄 Fetching job description from URL: ${job.applyUrl}`);
        try {
          fullDescription = await this.fetchJobUrlContent(job.applyUrl);
        } catch (error) {
          console.warn(`⚠️ Failed to fetch URL content: ${error}`);
          fullDescription = job.description || '';
        }
      }

      if (!fullDescription.trim()) {
        console.log(`⏭️ No description available for job ${job.id}, skipping analysis`);
        return;
      }

      // Analyze the job description using AI
      const analysis = await this.analyzeJobDescriptionWithAI(job, fullDescription);
      
      // Save job insights to database
      await this.saveJobInsights(job.id, analysis, fullDescription);
      
      // Update technology trends
      await this.updateTechnologyTrends(analysis.technologies);
      
      console.log(`✅ Market intelligence analysis completed for job ${job.id}`);
      
    } catch (error) {
      console.error(`❌ Error analyzing job description for ${job.id}:`, error);
      // Don't throw - we don't want to fail the entire job processing pipeline
    }
  }

  /**
   * Uses OpenAI to analyze job description and extract structured insights
   */
  private async analyzeJobDescriptionWithAI(job: JobListing, description: string): Promise<TechStackAnalysis> {
    const prompt = `
      Analyze this job posting and extract comprehensive market intelligence data:

      Job Title: ${job.title}
      Company: ${job.company}
      Location: ${job.location}
      Remote: ${job.isRemote}
      Salary: ${job.salary || 'Not specified'}
      
      Job Description:
      ${description}

      Please analyze and return a JSON object with this exact structure:
      {
        "technologies": [
          {
            "name": "React",
            "category": "Frontend Framework",
            "confidence": 0.95,
            "context": "3+ years experience required"
          }
        ],
        "experienceLevel": "mid",
        "skillRequirements": {
          "required": ["React", "JavaScript", "HTML/CSS"],
          "preferred": ["TypeScript", "Node.js"],
          "niceToHave": ["Docker", "AWS"]
        },
        "salaryRange": {
          "min": 80000,
          "max": 120000,
          "currency": "USD"
        },
        "benefits": ["Health insurance", "Remote work", "401k"],
        "responsibilities": ["Develop React components", "Collaborate with team"]
      }

      Guidelines:
      - Extract ALL technologies mentioned (programming languages, frameworks, tools, platforms)
      - Categorize technologies: Frontend Framework, Backend Framework, Programming Language, Database, Cloud Platform, DevOps Tool, etc.
      - Set confidence based on how explicitly the technology is mentioned (0.9+ for explicit requirements, 0.5-0.8 for implicit)
      - Determine experience level from years required, role seniority, or job complexity
      - Parse salary from any currency format (USD, PHP, etc.)
      - Extract specific benefits and responsibilities mentioned
      - Be comprehensive but accurate - only include what's actually mentioned
      - If salary not mentioned, omit salaryRange field entirely
    `;

    const response = await this.openai['openai'].chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing job postings for market intelligence. Return only valid JSON with comprehensive tech stack analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0].message.content || '{}';
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```/g, '')
      .trim();

    try {
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', content);
      
      // Return default structure if parsing fails
      return {
        technologies: [],
        experienceLevel: 'mid',
        skillRequirements: {
          required: [],
          preferred: [],
          niceToHave: []
        },
        benefits: [],
        responsibilities: []
      };
    }
  }

  /**
   * Saves job insights to the database
   */
  private async saveJobInsights(jobId: string, analysis: TechStackAnalysis, _fullDescription: string): Promise<void> {
    try {
      // Calculate competitiveness and rarity scores
      const competitiveness = this.calculateCompetitiveness(analysis);
      const rarityScore = this.calculateRarityScore(analysis.technologies);

      await this.db.client.jobInsight.upsert({
        where: { jobId },
        update: {
          technologies: analysis.technologies,
          skillRequirements: analysis.skillRequirements,
          experienceLevel: analysis.experienceLevel,
          salaryRange: analysis.salaryRange || null,
          keySkills: analysis.skillRequirements.required,
          niceToHave: analysis.skillRequirements.niceToHave,
          responsibilities: analysis.responsibilities,
          benefits: analysis.benefits || null,
          competitiveness,
          rarityScore,
          updatedAt: new Date()
        },
        create: {
          jobId,
          technologies: analysis.technologies,
          skillRequirements: analysis.skillRequirements,
          experienceLevel: analysis.experienceLevel,
          salaryRange: analysis.salaryRange || null,
          keySkills: analysis.skillRequirements.required,
          niceToHave: analysis.skillRequirements.niceToHave,
          responsibilities: analysis.responsibilities,
          benefits: analysis.benefits || null,
          competitiveness,
          rarityScore
        }
      });

      console.log(`💾 Saved job insights for ${jobId}`);
    } catch (error) {
      console.error(`❌ Failed to save job insights for ${jobId}:`, error);
    }
  }

  /**
   * Updates technology trend data
   */
  private async updateTechnologyTrends(technologies: Array<{name: string; category: string; confidence: number}>): Promise<void> {
    try {
      const currentWeek = this.getCurrentWeekStart();
      
      for (const tech of technologies) {
        if (tech.confidence < 0.5) continue; // Only count high-confidence mentions
        
        // Ensure technology record exists
        await this.db.client.techTrend.upsert({
          where: { technology: tech.name },
          update: { 
            category: tech.category,
            updatedAt: new Date()
          },
          create: {
            technology: tech.name,
            category: tech.category,
            description: `${tech.category} technology`
          }
        });

        // Update weekly stats
        await this.db.client.techTrendWeekly.upsert({
          where: {
            trendId_weekStart: {
              trendId: (await this.db.client.techTrend.findUnique({
                where: { technology: tech.name }
              }))!.id,
              weekStart: currentWeek
            }
          },
          update: {
            mentions: { increment: 1 },
            jobCount: { increment: 1 }
          },
          create: {
            techTrend: { connect: { technology: tech.name } },
            weekStart: currentWeek,
            mentions: 1,
            jobCount: 1,
            percentage: 0, // Will be calculated later
            growthRate: 0, // Will be calculated later
            trendStatus: 'stable'
          }
        });
      }

      console.log(`📊 Updated technology trends for ${technologies.length} technologies`);
    } catch (error) {
      console.error(`❌ Failed to update technology trends:`, error);
    }
  }

  /**
   * Calculates how competitive a job is based on requirements
   */
  private calculateCompetitiveness(analysis: TechStackAnalysis): number {
    const totalSkills = analysis.skillRequirements.required.length + 
                       analysis.skillRequirements.preferred.length;
    
    const experienceLevelScore = {
      'junior': 0.2,
      'mid': 0.5,
      'senior': 0.8,
      'lead': 0.9,
      'principal': 1.0
    }[analysis.experienceLevel] || 0.5;

    const technologyComplexity = analysis.technologies.length * 0.1;
    
    return Math.min(1.0, (totalSkills * 0.05) + experienceLevelScore + technologyComplexity);
  }

  /**
   * Calculates how rare the skill combination is
   */
  private calculateRarityScore(technologies: Array<{name: string; confidence: number}>): number {
    // Simple heuristic: more technologies with high confidence = rarer combination
    const highConfidenceTechs = technologies.filter(t => t.confidence > 0.8);
    return Math.min(1.0, highConfidenceTechs.length * 0.15);
  }

  /**
   * Gets the start of the current week (Monday)
   */
  private getCurrentWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Fetches job content from URL (reusing logic from OpenAI service)
   */
  private async fetchJobUrlContent(url: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          Connection: 'keep-alive'
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Extract text content
      let text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Limit content size
      if (text.length > 5000) {
        text = text.substring(0, 5000) + '...';
      }

      return text;
    } catch (error) {
      throw new Error(`Failed to fetch URL content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates market snapshot for a given date
   */
  async generateMarketSnapshot(date?: Date): Promise<void> {
    try {
      const snapshotDate = date || new Date();
      console.log(`📊 Generating market snapshot for ${snapshotDate.toISOString()}`);

      // Get jobs from the last week
      const oneWeekAgo = new Date(snapshotDate);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentJobs = await this.db.client.job.findMany({
        where: {
          createdAt: {
            gte: oneWeekAgo,
            lte: snapshotDate
          }
        },
        include: {
          insights: true
        }
      });

      if (recentJobs.length === 0) {
        console.log('No recent jobs found for market snapshot');
        return;
      }

      // Aggregate market data
      const totalJobs = recentJobs.length;
      const jobsWithInsights = recentJobs.filter(j => j.insights);
      
      // Calculate technology popularity
      const techCounts: Record<string, number> = {};
      const salaries: number[] = [];
      
      jobsWithInsights.forEach(job => {
        if (job.insights?.technologies) {
          const technologies = job.insights.technologies as any[];
          technologies.forEach((tech: any) => {
            if (tech.confidence > 0.7) {
              techCounts[tech.name] = (techCounts[tech.name] || 0) + 1;
            }
          });
        }
        
        if (job.insights?.salaryRange) {
          const salaryRange = job.insights.salaryRange as any;
          if (salaryRange.min) salaries.push(salaryRange.min);
          if (salaryRange.max) salaries.push(salaryRange.max);
        }
      });

      const topTechnologies = Object.entries(techCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([tech, count]) => ({
          technology: tech,
          count,
          percentage: (count / totalJobs) * 100
        }));

      const avgSalaryRange = salaries.length > 0 ? {
        min: Math.min(...salaries),
        max: Math.max(...salaries),
        avg: salaries.reduce((a, b) => a + b, 0) / salaries.length
      } : null;

      // Save market snapshot
      await this.db.client.marketSnapshot.upsert({
        where: { snapshotDate },
        update: {
          totalJobs,
          avgSalaryRange,
          topTechnologies,
          emergingSkills: [], // TODO: Calculate emerging skills
          marketTrends: {}, // TODO: Calculate market trends
          salaryTrends: {}, // TODO: Calculate salary trends
          skillDemand: techCounts
        },
        create: {
          snapshotDate,
          totalJobs,
          avgSalaryRange,
          topTechnologies,
          emergingSkills: [],
          marketTrends: {},
          salaryTrends: {},
          skillDemand: techCounts
        }
      });

      console.log(`✅ Market snapshot generated: ${totalJobs} jobs, ${topTechnologies.length} top technologies`);
      
    } catch (error) {
      console.error(`❌ Failed to generate market snapshot:`, error);
    }
  }

  async cleanup(): Promise<void> {
    await this.db.close();
  }
}