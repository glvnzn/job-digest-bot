/**
 * Main Database Service - Prisma-Based Implementation
 * 
 * This service provides the complete database interface using Prisma ORM:
 * 1. Type-safe database operations with full schema validation
 * 2. Support for both legacy bot functionality and new multi-user features
 * 3. Automatic connection pooling and migration handling
 * 4. Production-ready error handling and logging
 */

import { PrismaDatabaseService } from './database-prisma';
import { JobListing, ResumeAnalysis, ProcessedEmail } from '../models/types';

export class DatabaseService {
  private prismaService: PrismaDatabaseService;

  constructor() {
    this.prismaService = new PrismaDatabaseService();
  }

  async init(): Promise<void> {
    try {
      await this.prismaService.init();
      console.log('✅ Database (Prisma) initialized successfully');
    } catch (error) {
      console.error('❌ Database (Prisma) initialization failed:', error);
      throw error;
    }
  }

  // ===== EXACT SAME INTERFACE AS OLD DATABASE SERVICE =====

  /**
   * Save a job - exactly like the old method
   */
  async saveJob(job: JobListing): Promise<void> {
    await this.prismaService.saveJob({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      isRemote: job.isRemote,
      description: job.description,
      requirements: job.requirements,
      applyUrl: job.applyUrl,
      salary: job.salary ?? undefined,
      postedDate: job.postedDate,
      source: job.source,
      relevanceScore: job.relevanceScore,
      emailMessageId: job.emailMessageId,
      processed: job.processed,
      createdAt: job.createdAt,
    });
  }

  /**
   * Save resume analysis - exactly like the old method
   */
  async saveResumeAnalysis(analysis: ResumeAnalysis): Promise<void> {
    await this.prismaService.client.resumeAnalysis.create({
      data: {
        skills: analysis.skills,
        experience: analysis.experience,
        preferredRoles: analysis.preferredRoles,
        seniority: analysis.seniority,
        analyzedAt: analysis.analyzedAt,
      },
    });
  }

  /**
   * Save processed email - exactly like the old method
   */
  async saveProcessedEmail(email: ProcessedEmail): Promise<void> {
    await this.prismaService.saveProcessedEmail({
      messageId: email.messageId,
      subject: email.subject,
      fromEmail: email.from,
      jobsExtracted: email.jobsExtracted,
      deleted: email.deleted,
    });
  }

  /**
   * Get latest resume analysis - exactly like the old method
   */
  async getLatestResumeAnalysis(): Promise<ResumeAnalysis | null> {
    const analysis = await this.prismaService.client.resumeAnalysis.findFirst({
      orderBy: { analyzedAt: 'desc' },
    });

    if (!analysis) return null;

    return {
      skills: analysis.skills,
      experience: analysis.experience,
      preferredRoles: analysis.preferredRoles,
      seniority: analysis.seniority || '',
      analyzedAt: analysis.analyzedAt,
    };
  }

  /**
   * Check if email is processed - exactly like the old method
   */
  async isEmailProcessed(messageId: string): Promise<boolean> {
    return await this.prismaService.isEmailProcessed(messageId);
  }

  /**
   * Get relevant jobs - exactly like the old method
   */
  async getRelevantJobs(minScore: number = 0.7): Promise<JobListing[]> {
    const jobs = await this.prismaService.getRelevantJobs(minScore);
    
    // Convert Prisma result to old JobListing format
    return jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location || '',
      isRemote: job.isRemote,
      description: job.description || '',
      requirements: job.requirements,
      applyUrl: job.applyUrl,
      salary: job.salary ?? undefined,
      postedDate: job.postedDate || new Date(),
      source: job.source,
      relevanceScore: job.relevanceScore || 0,
      emailMessageId: job.emailMessageId,
      processed: job.processed,
      createdAt: job.createdAt,
    }));
  }

  /**
   * Mark job as processed - exactly like the old method
   */
  async markJobAsProcessed(jobId: string): Promise<void> {
    await this.prismaService.markJobAsProcessed(jobId);
  }

  /**
   * Get daily job summary - exactly like the old method
   */
  async getDailyJobSummary(date: Date): Promise<JobListing[]> {
    const jobs = await this.prismaService.getDailyJobSummary(date);
    
    // Convert Prisma result to old JobListing format
    return jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location || '',
      isRemote: job.isRemote,
      description: job.description || '',
      requirements: job.requirements,
      applyUrl: job.applyUrl,
      salary: job.salary ?? undefined,
      postedDate: job.postedDate || new Date(),
      source: job.source,
      relevanceScore: job.relevanceScore || 0,
      emailMessageId: job.emailMessageId,
      processed: job.processed,
      createdAt: job.createdAt,
    }));
  }

  /**
   * Get daily stats - exactly like the old method
   */
  async getDailyStats(date: Date): Promise<{
    totalJobsProcessed: number;
    relevantJobs: number;
    emailsProcessed: number;
    topSources: Array<{ source: string; count: number }>;
  }> {
    // Convert Manila "day" to UTC time range for database query
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfDayUTC = new Date(startOfDay.getTime() - 8 * 60 * 60 * 1000);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const endOfDayUTC = new Date(endOfDay.getTime() - 8 * 60 * 60 * 1000);

    // Parallel queries for better performance
    const [totalJobs, relevantJobs, emailsProcessed, topSources] = await Promise.all([
      // Total jobs processed today (with valid URLs)
      this.prismaService.client.job.count({
        where: {
          createdAt: { gte: startOfDayUTC, lte: endOfDayUTC },
          applyUrl: { notIn: ['', 'Unknown URL'] },
        },
      }),

      // Relevant jobs count (with valid URLs)
      this.prismaService.client.job.count({
        where: {
          createdAt: { gte: startOfDayUTC, lte: endOfDayUTC },
          relevanceScore: { gte: 0.6 },
          applyUrl: { notIn: ['', 'Unknown URL'] },
        },
      }),

      // Emails processed today
      this.prismaService.client.processedEmail.count({
        where: {
          processedAt: { gte: startOfDayUTC, lte: endOfDayUTC },
        },
      }),

      // Top sources (with valid URLs)
      this.prismaService.client.job.groupBy({
        by: ['source'],
        where: {
          createdAt: { gte: startOfDayUTC, lte: endOfDayUTC },
          relevanceScore: { gte: 0.6 },
          applyUrl: { notIn: ['', 'Unknown URL'] },
        },
        _count: { source: true },
        orderBy: { _count: { source: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalJobsProcessed: totalJobs,
      relevantJobs: relevantJobs,
      emailsProcessed: emailsProcessed,
      topSources: topSources.map(item => ({
        source: item.source,
        count: item._count.source,
      })),
    };
  }

  // ===== NEW METHODS (for web interface) =====

  /**
   * Get the underlying Prisma service for advanced operations
   */
  get prisma(): PrismaDatabaseService {
    return this.prismaService;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.prismaService.close();
  }
}