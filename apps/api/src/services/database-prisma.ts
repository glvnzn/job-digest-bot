import { PrismaClient, Job, User, JobStage, UserJob, Prisma } from '@prisma/client';

/**
 * Modern Prisma-based Database Service
 * 
 * This replaces the raw SQL DatabaseService with:
 * - Full type safety
 * - Automatic migrations  
 * - Robust query building
 * - Built-in connection pooling
 * - Production-ready error handling
 */
export class PrismaDatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'colorless',
    });
  }

  async init(): Promise<void> {
    try {
      // Test connection
      await this.prisma.$connect();
      console.log('✅ Prisma database connected successfully');
      
      // Initialize default job stages if they don't exist
      await this.initializeDefaultStages();
    } catch (error) {
      console.error('❌ Prisma database connection failed:', error);
      throw error;
    }
  }

  /**
   * Initialize default job stages (system stages)
   */
  private async initializeDefaultStages(): Promise<void> {
    const defaultStages = [
      { name: 'Interested', color: '#3B82F6', sortOrder: 1 },
      { name: 'Applied', color: '#F59E0B', sortOrder: 2 },
      { name: 'Phone Screen', color: '#8B5CF6', sortOrder: 3 },
      { name: 'Technical Interview', color: '#06B6D4', sortOrder: 4 },
      { name: 'Final Round', color: '#10B981', sortOrder: 5 },
      { name: 'Offer Received', color: '#22C55E', sortOrder: 6 },
      { name: 'Accepted', color: '#16A34A', sortOrder: 7 },
      { name: 'Rejected', color: '#EF4444', sortOrder: 8 },
      { name: 'Not Interested', color: '#6B7280', sortOrder: 9 },
    ];

    for (const stage of defaultStages) {
      await this.prisma.jobStage.upsert({
        where: { 
          name_isSystem: { 
            name: stage.name, 
            isSystem: true 
          } 
        },
        update: {}, // Don't update if exists
        create: {
          ...stage,
          isSystem: true,
          userId: null, // System stage
        },
      });
    }
  }

  // ===== LEGACY METHODS (for existing bot functionality) =====

  /**
   * Save a job (existing bot functionality)
   */
  async saveJob(jobData: {
    id: string;
    title: string;
    company: string;
    location?: string;
    isRemote?: boolean;
    description?: string;
    requirements?: string[];
    applyUrl: string;
    salary?: string;
    postedDate?: Date;
    source: string;
    relevanceScore?: number;
    emailMessageId: string;
    processed?: boolean;
    createdAt?: Date;
  }): Promise<Job> {
    return await this.prisma.job.upsert({
      where: { id: jobData.id },
      update: {
        relevanceScore: jobData.relevanceScore,
        processed: jobData.processed ?? false,
      },
      create: {
        id: jobData.id,
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        isRemote: jobData.isRemote ?? false,
        description: jobData.description,
        requirements: jobData.requirements ?? [],
        applyUrl: jobData.applyUrl,
        salary: jobData.salary,
        postedDate: jobData.postedDate,
        source: jobData.source,
        relevanceScore: jobData.relevanceScore,
        emailMessageId: jobData.emailMessageId,
        processed: jobData.processed ?? false,
        createdAt: jobData.createdAt,
      },
    });
  }

  /**
   * Get relevant jobs (existing bot functionality)
   */
  async getRelevantJobs(minScore: number = 0.7): Promise<Job[]> {
    return await this.prisma.job.findMany({
      where: {
        relevanceScore: { gte: minScore },
        isRemote: true,
        processed: false,
      },
      orderBy: [
        { relevanceScore: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Mark job as processed (existing bot functionality)
   */
  async markJobAsProcessed(jobId: string): Promise<void> {
    await this.prisma.job.update({
      where: { id: jobId },
      data: { processed: true },
    });
  }

  /**
   * Check if email is processed
   */
  async isEmailProcessed(messageId: string): Promise<boolean> {
    const email = await this.prisma.processedEmail.findUnique({
      where: { messageId },
    });
    return !!email;
  }

  /**
   * Save processed email
   */
  async saveProcessedEmail(emailData: {
    messageId: string;
    subject?: string;
    fromEmail?: string;
    jobsExtracted?: number;
    deleted?: boolean;
  }): Promise<void> {
    await this.prisma.processedEmail.upsert({
      where: { messageId: emailData.messageId },
      update: { deleted: emailData.deleted ?? false },
      create: {
        messageId: emailData.messageId,
        subject: emailData.subject,
        fromEmail: emailData.fromEmail,
        jobsExtracted: emailData.jobsExtracted ?? 0,
        deleted: emailData.deleted ?? false,
      },
    });
  }

  // ===== NEW MULTI-USER METHODS =====

  /**
   * User Management
   */
  async createUser(userData: {
    email: string;
    googleId: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<User> {
    return await this.prisma.user.create({
      data: userData,
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        customJobStages: true,
        userJobs: {
          include: {
            job: true,
            stage: true,
          },
        },
      },
    });
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  /**
   * Job Queries with Advanced Filtering
   */
  async getJobsWithFilters(filters: {
    search?: string;
    company?: string;
    location?: string;
    remote?: boolean;
    minRelevanceScore?: number;
    maxRelevanceScore?: number;
    datePosted?: 'today' | 'week' | 'month' | 'all';
    limit?: number;
    offset?: number;
  } = {}) {
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;

    // Build dynamic where clause
    const where: Prisma.JobWhereInput = {};

    // Search across title, company, description
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.company) {
      where.company = { contains: filters.company, mode: 'insensitive' };
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.remote !== undefined) {
      where.isRemote = filters.remote;
    }

    if (filters.minRelevanceScore !== undefined) {
      where.relevanceScore = { 
        ...((where.relevanceScore as object) || {}), 
        gte: filters.minRelevanceScore 
      };
    }

    if (filters.maxRelevanceScore !== undefined) {
      where.relevanceScore = { 
        ...((where.relevanceScore as object) || {}), 
        lte: filters.maxRelevanceScore 
      };
    }

    // Date filtering
    if (filters.datePosted && filters.datePosted !== 'all') {
      const now = new Date();
      let dateThreshold: Date;

      switch (filters.datePosted) {
        case 'today':
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateThreshold = new Date(0);
      }

      where.createdAt = { gte: dateThreshold };
    }

    // Execute queries in parallel for better performance
    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: [
          { relevanceScore: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
        include: {
          userJobs: {
            select: { userId: true, stageId: true },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      jobs,
      meta: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Job Tracking (User-specific)
   */
  async trackJob(userId: number, jobId: string, stageId?: number): Promise<UserJob> {
    // Get default "Interested" stage if none specified
    if (!stageId) {
      const interestedStage = await this.prisma.jobStage.findFirst({
        where: { name: 'Interested', isSystem: true },
      });
      stageId = interestedStage?.id ?? 1;
    }

    return await this.prisma.userJob.upsert({
      where: {
        userId_jobId: { userId, jobId },
      },
      update: {
        isTracked: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        jobId,
        stageId,
        isTracked: true,
      },
      include: {
        job: true,
        stage: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async untrackJob(userId: number, jobId: string): Promise<void> {
    await this.prisma.userJob.delete({
      where: {
        userId_jobId: { userId, jobId },
      },
    });
  }

  async getUserJobs(userId: number): Promise<UserJob[]> {
    return await this.prisma.userJob.findMany({
      where: {
        userId,
        isTracked: true,
      },
      include: {
        job: true,
        stage: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Job Stages Management
   */
  async getJobStages(userId?: number): Promise<JobStage[]> {
    return await this.prisma.jobStage.findMany({
      where: {
        OR: [
          { isSystem: true }, // System stages
          { userId: userId }, // User's custom stages
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get daily job summary (existing bot functionality)
   */
  async getDailyJobSummary(date: Date): Promise<Job[]> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfDayUTC = new Date(startOfDay.getTime() - 8 * 60 * 60 * 1000);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const endOfDayUTC = new Date(endOfDay.getTime() - 8 * 60 * 60 * 1000);

    return await this.prisma.job.findMany({
      where: {
        createdAt: {
          gte: startOfDayUTC,
          lte: endOfDayUTC,
        },
        relevanceScore: { gte: 0.6 },
        applyUrl: {
          not: {
            in: ['', 'Unknown URL'],
          },
        },
      },
      orderBy: [
        { isRemote: 'desc' },
        { relevanceScore: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // Expose Prisma client for advanced operations
  get client(): PrismaClient {
    return this.prisma;
  }
}