import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { JobProcessor } from './job-processor';

// Redis connection
const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

// Job types
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

export class QueueService {
  private jobQueue: Queue;
  private worker: Worker | null = null;
  private jobProcessor: JobProcessor;
  private queueName: string;

  constructor(jobProcessor: JobProcessor) {
    this.jobProcessor = jobProcessor;

    // Environment-specific queue name to avoid conflicts
    const env = process.env.NODE_ENV || 'development';
    this.queueName = `job-processing-${env}`;

    // Create job queue
    this.jobQueue = new Queue(this.queueName, {
      connection,
      defaultJobOptions: {
        removeOnComplete: 5, // Keep last 5 completed jobs
        removeOnFail: 10, // Keep last 10 failed jobs
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    console.log(`🔄 Queue service initialized (${this.queueName})`);
  }

  async startWorker(): Promise<void> {
    if (this.worker) {
      console.log('⚠️ Worker already running');
      return;
    }

    this.worker = new Worker(
      this.queueName,
      async (job: Job) => {
        console.log(`🔄 Processing job: ${job.name} (ID: ${job.id})`);

        try {
          switch (job.name) {
            case 'process-jobs': {
              const processData = job.data as ProcessJobsData;
              await this.jobProcessor.processJobAlertsInternal(processData.minRelevanceScore, job);
              break;
            }
            case 'daily-summary': {
              await this.jobProcessor.sendDailySummaryInternal(job);
              break;
            }

            default:
              throw new Error(`Unknown job type: ${job.name}`);
          }

          await job.updateProgress(100);
          console.log(`✅ Job completed: ${job.name} (ID: ${job.id})`);
        } catch (error) {
          console.error(`❌ Job failed: ${job.name} (ID: ${job.id})`, error);
          throw error;
        }
      },
      {
        connection,
        concurrency: 1, // Process one job at a time to prevent conflicts
      }
    );

    // Worker event listeners
    this.worker.on('completed', (job) => {
      console.log(`🎉 Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`💥 Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('🚨 Worker error:', err);
    });

    console.log('👷 Worker started');
  }

  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      console.log('🛑 Worker stopped');
    }
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
    });

    console.log(`📝 Added job processing job (ID: ${job.id}) triggered by: ${data.triggeredBy}`);
    return job.id!;
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

    const job = await this.jobQueue.add('daily-summary', data);

    console.log(`📝 Added daily summary job (ID: ${job.id}) triggered by: ${data.triggeredBy}`);
    return job.id!;
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
    progressData?: string;
    processedOn?: number;
  } | null> {
    const activeJobs = await this.jobQueue.getActive();
    if (activeJobs.length === 0) return null;

    const job = activeJobs[0];
    return {
      id: job.id!,
      name: job.name,
      progress: job.progress,
      progressData: job.data?.progressData || undefined,
      processedOn: job.processedOn,
    };
  }

  async close(): Promise<void> {
    await this.stopWorker();
    await this.jobQueue.close();
    await connection.quit();
    console.log('🔄 Queue service closed');
  }
}
