import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';

export interface ProcessJobsData {
  minRelevanceScore?: number;
  triggeredBy: 'cron' | 'manual' | 'telegram';
  chatId?: string;
  progressMessageId?: number;
}

export interface DailySummaryData {
  triggeredBy: 'cron' | 'manual';
  chatId?: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('job-processing') private jobQueue: Queue,
    private configService: ConfigService
  ) {
    const env = this.configService.get<string>('NODE_ENV') || 'development';
    this.logger.log(`🔄 Queue service initialized (job-processing-${env})`);
  }

  async addProcessJobsJob(data: ProcessJobsData): Promise<string> {
    // Check if there's already a job processing running
    const waitingJobs = await this.jobQueue.getWaiting();
    const activeJobs = await this.jobQueue.getActive();

    const existingJobs = [...waitingJobs, ...activeJobs].filter(
      (job) => job.name === 'process-jobs'
    );

    if (existingJobs.length > 0) {
      throw new Error('Job processing already in queue or running');
    }

    const job = await this.jobQueue.add('process-jobs', data, {
      priority: data.triggeredBy === 'manual' ? 1 : 10, // Manual jobs get higher priority
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(`📝 Added job processing job (ID: ${job.id}) triggered by: ${data.triggeredBy}`);
    return job.id.toString();
  }

  async addDailySummaryJob(data: DailySummaryData): Promise<string> {
    // Check if there's already a daily summary running
    const waitingJobs = await this.jobQueue.getWaiting();
    const activeJobs = await this.jobQueue.getActive();

    const existingJobs = [...waitingJobs, ...activeJobs].filter(
      (job) => job.name === 'daily-summary'
    );

    if (existingJobs.length > 0) {
      throw new Error('Daily summary already in queue or running');
    }

    const job = await this.jobQueue.add('daily-summary', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(`📝 Added daily summary job (ID: ${job.id}) triggered by: ${data.triggeredBy}`);
    return job.id.toString();
  }

  async getJobStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.jobQueue.getWaiting(),
      this.jobQueue.getActive(),
      this.jobQueue.getCompleted(),
      this.jobQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async getCurrentJob(): Promise<{
    id: string;
    name: string;
    progress: number;
    data?: any;
    processedOn?: number;
  } | null> {
    const activeJobs = await this.jobQueue.getActive();
    if (activeJobs.length === 0) return null;

    const job = activeJobs[0];
    return {
      id: job.id.toString(),
      name: job.name,
      progress: job.progress(),
      data: job.data,
      processedOn: job.processedOn,
    };
  }

  async cleanOldJobs(): Promise<void> {
    // Clean up old completed and failed jobs
    await this.jobQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Keep completed jobs for 24 hours
    await this.jobQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Keep failed jobs for 7 days
    this.logger.log('🧹 Cleaned old jobs from queue');
  }
}