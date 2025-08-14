import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, MoreThanOrEqual, SelectQueryBuilder, Between } from 'typeorm';
import { Job } from '../entities/job.entity';

export interface JobFilters {
  search?: string;
  minRelevanceScore?: number;
  maxRelevanceScore?: number;
  isRemote?: boolean;
  companies?: string[];
  locations?: string[];
  jobTypes?: string[];
  salaryMin?: number;
  salaryMax?: number;
  dateRange?: 'day' | 'week' | 'month';
  processed?: boolean;
  sources?: string[];
}

@Injectable()
export class JobRepository {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>
  ) {}

  async create(jobData: Partial<Job>): Promise<Job> {
    const job = this.jobRepository.create(jobData);
    return this.jobRepository.save(job);
  }

  async findById(id: number): Promise<Job | null> {
    return this.jobRepository.findOne({ where: { id } });
  }

  async findWithUserJobs(id: number): Promise<Job | null> {
    return this.jobRepository.findOne({
      where: { id },
      relations: ['userJobs', 'userJobs.user', 'userJobs.stage'],
    });
  }

  async findWithFilters(filters: JobFilters = {}): Promise<Job[]> {
    const query = this.createFilterQuery(filters);
    return query.getMany();
  }

  async findWithPagination(
    filters: JobFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: Job[]; total: number }> {
    const query = this.createFilterQuery(filters);
    
    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findRelevantJobs(minScore: number = 0.6): Promise<Job[]> {
    return this.jobRepository.find({
      where: {
        relevanceScore: MoreThanOrEqual(minScore),
        processed: false,
      },
      order: {
        relevanceScore: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findRecentJobs(days: number = 7): Promise<Job[]> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return this.jobRepository.find({
      where: {
        createdAt: MoreThanOrEqual(dateFrom),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findByEmailMessageId(emailMessageId: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: { emailMessageId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: number, updates: Partial<Job>): Promise<Job | null> {
    await this.jobRepository.update(id, updates);
    return this.findById(id);
  }

  async markAsProcessed(id: number): Promise<void> {
    await this.jobRepository.update(id, { processed: true });
  }

  async delete(id: number): Promise<void> {
    await this.jobRepository.delete(id);
  }

  async getDailyStats(date: Date): Promise<{
    totalJobsProcessed: number;
    relevantJobs: number;
    topSources: Array<{ source: string; count: number }>;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const totalJobsProcessed = await this.jobRepository.count({
      where: {
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    const relevantJobs = await this.jobRepository.count({
      where: {
        createdAt: Between(startOfDay, endOfDay),
        relevanceScore: MoreThanOrEqual(0.6),
      },
    });

    const topSourcesQuery = await this.jobRepository
      .createQueryBuilder('job')
      .select('job.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('job.created_at BETWEEN :startOfDay AND :endOfDay', {
        startOfDay,
        endOfDay,
      })
      .andWhere('job.source IS NOT NULL')
      .groupBy('job.source')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    const topSources = topSourcesQuery.map(result => ({
      source: result.source,
      count: parseInt(result.count),
    }));

    return {
      totalJobsProcessed,
      relevantJobs,
      topSources,
    };
  }

  private createFilterQuery(filters: JobFilters): SelectQueryBuilder<Job> {
    const query = this.jobRepository.createQueryBuilder('job');

    if (filters.search) {
      query.andWhere(
        '(job.title ILIKE :search OR job.company ILIKE :search OR job.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.minRelevanceScore !== undefined) {
      query.andWhere('job.relevanceScore >= :minScore', {
        minScore: filters.minRelevanceScore,
      });
    }

    if (filters.maxRelevanceScore !== undefined) {
      query.andWhere('job.relevanceScore <= :maxScore', {
        maxScore: filters.maxRelevanceScore,
      });
    }

    if (filters.isRemote !== undefined) {
      query.andWhere('job.isRemote = :isRemote', {
        isRemote: filters.isRemote,
      });
    }

    if (filters.companies && filters.companies.length > 0) {
      query.andWhere('job.company IN (:...companies)', {
        companies: filters.companies,
      });
    }

    if (filters.locations && filters.locations.length > 0) {
      query.andWhere('job.location IN (:...locations)', {
        locations: filters.locations,
      });
    }

    if (filters.jobTypes && filters.jobTypes.length > 0) {
      query.andWhere('job.jobType IN (:...jobTypes)', {
        jobTypes: filters.jobTypes,
      });
    }

    if (filters.sources && filters.sources.length > 0) {
      query.andWhere('job.source IN (:...sources)', {
        sources: filters.sources,
      });
    }

    if (filters.salaryMin !== undefined) {
      query.andWhere('(job.salaryMin >= :salaryMin OR job.salaryMin IS NULL)', {
        salaryMin: filters.salaryMin,
      });
    }

    if (filters.salaryMax !== undefined) {
      query.andWhere('(job.salaryMax <= :salaryMax OR job.salaryMax IS NULL)', {
        salaryMax: filters.salaryMax,
      });
    }

    if (filters.processed !== undefined) {
      query.andWhere('job.processed = :processed', {
        processed: filters.processed,
      });
    }

    if (filters.dateRange) {
      const now = new Date();
      let dateFrom = new Date();

      switch (filters.dateRange) {
        case 'day':
          dateFrom.setDate(now.getDate() - 1);
          break;
        case 'week':
          dateFrom.setDate(now.getDate() - 7);
          break;
        case 'month':
          dateFrom.setMonth(now.getMonth() - 1);
          break;
      }

      query.andWhere('job.createdAt >= :dateFrom', { dateFrom });
    }

    return query.orderBy('job.relevanceScore', 'DESC')
                .addOrderBy('job.createdAt', 'DESC');
  }

  async count(filters: JobFilters = {}): Promise<number> {
    const query = this.createFilterQuery(filters);
    return query.getCount();
  }
}