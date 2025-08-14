import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobProcessorService } from './job-processor.service';
import { ProcessJobsData, DailySummaryData } from './queue.service';

@Processor('job-processing')
@Injectable()
export class JobQueueProcessor {
  private readonly logger = new Logger(JobQueueProcessor.name);

  constructor(private jobProcessorService: JobProcessorService) {}

  @Process('process-jobs')
  async handleProcessJobs(job: Job<ProcessJobsData>) {
    this.logger.log(`🔄 Processing job: ${job.name} (ID: ${job.id})`);

    try {
      const data = job.data;
      
      // Update progress
      await job.progress(5);
      await job.log('Initializing job processing...');

      // Call the job processor service with progress tracking
      await this.jobProcessorService.processJobAlertsWithProgress(
        data.minRelevanceScore || 0.6,
        async (progress: number, message: string) => {
          await job.progress(progress);
          await job.log(message);
        },
        data.progressMessageId
      );

      await job.progress(100);
      await job.log('Job processing completed successfully');
      this.logger.log(`✅ Job completed: ${job.name} (ID: ${job.id})`);
    } catch (error) {
      this.logger.error(`❌ Job failed: ${job.name} (ID: ${job.id})`, error);
      throw error;
    }
  }

  @Process('daily-summary')
  async handleDailySummary(job: Job<DailySummaryData>) {
    this.logger.log(`🔄 Processing job: ${job.name} (ID: ${job.id})`);

    try {
      await job.progress(10);
      await job.log('Generating daily summary...');

      await this.jobProcessorService.sendDailySummaryWithProgress(
        async (progress: number, message: string) => {
          await job.progress(progress);
          await job.log(message);
        }
      );

      await job.progress(100);
      await job.log('Daily summary completed successfully');
      this.logger.log(`✅ Job completed: ${job.name} (ID: ${job.id})`);
    } catch (error) {
      this.logger.error(`❌ Job failed: ${job.name} (ID: ${job.id})`, error);
      throw error;
    }
  }
}