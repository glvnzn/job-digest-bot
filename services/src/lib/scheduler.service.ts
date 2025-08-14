import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private queueService: QueueService,
    private configService: ConfigService
  ) {
    const env = this.configService.get<string>('NODE_ENV') || 'development';
    this.logger.log(`⏱️ Scheduler service initialized for ${env} environment`);
    
    if (env === 'production') {
      this.logger.log('⏰ Scheduled job processing: 6 AM - 8 PM Manila time (hourly)');
      this.logger.log('🌙 Scheduled daily summary: 9 PM Manila time daily');
    } else {
      this.logger.log('💡 Development mode: Use Telegram commands to manually trigger processing');
    }
  }

  // Schedule job processing every hour from 6 AM to 8 PM Manila time
  // Cron expression: "0 6-20 * * *" but adjusted for Manila timezone (UTC+8)
  // This runs at 22:00-14:00 UTC (6 AM - 8 PM Manila)
  @Cron('0 22,23,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14 * * *', {
    name: 'hourly-job-processing',
    timeZone: 'UTC',
  })
  async handleHourlyJobProcessing() {
    // Only run in production
    const env = this.configService.get<string>('NODE_ENV') || 'development';
    if (env !== 'production') {
      return;
    }

    try {
      this.logger.log('⏰ Running scheduled job processing...');
      await this.queueService.addProcessJobsJob({
        minRelevanceScore: 0.6,
        triggeredBy: 'cron',
      });
      this.logger.log('✅ Scheduled job processing queued successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        this.logger.log('⏳ Job processing already in queue or running');
      } else {
        this.logger.error('❌ Scheduled job processing failed:', error);
      }
    }
  }

  // Schedule daily summary at 9 PM Manila time
  // 9 PM Manila = 13:00 UTC
  @Cron('0 13 * * *', {
    name: 'daily-summary',
    timeZone: 'UTC',
  })
  async handleDailySummary() {
    // Only run in production
    const env = this.configService.get<string>('NODE_ENV') || 'development';
    if (env !== 'production') {
      return;
    }

    try {
      const currentTime = new Date().toISOString();
      this.logger.log(`🌙 Running daily summary at ${currentTime} (9 PM Manila trigger)...`);
      
      await this.queueService.addDailySummaryJob({
        triggeredBy: 'cron',
      });
      
      this.logger.log('✅ Daily summary queued successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        this.logger.log('⏳ Daily summary already in queue or running');
      } else {
        this.logger.error('❌ Daily summary failed:', error);
      }
    }
  }

  // Clean old jobs every day at midnight UTC
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'cleanup-old-jobs',
    timeZone: 'UTC',
  })
  async handleJobCleanup() {
    try {
      this.logger.log('🧹 Running scheduled job cleanup...');
      await this.queueService.cleanOldJobs();
      this.logger.log('✅ Job cleanup completed');
    } catch (error) {
      this.logger.error('❌ Job cleanup failed:', error);
    }
  }

  // Test method for manual triggering (development)
  async triggerJobProcessingManually(): Promise<void> {
    try {
      this.logger.log('🔧 Manual job processing triggered...');
      await this.queueService.addProcessJobsJob({
        minRelevanceScore: 0.6,
        triggeredBy: 'manual',
      });
      this.logger.log('✅ Manual job processing queued');
    } catch (error) {
      this.logger.error('❌ Manual job processing failed:', error);
      throw error;
    }
  }

  async triggerDailySummaryManually(): Promise<void> {
    try {
      this.logger.log('🔧 Manual daily summary triggered...');
      await this.queueService.addDailySummaryJob({
        triggeredBy: 'manual',
      });
      this.logger.log('✅ Manual daily summary queued');
    } catch (error) {
      this.logger.error('❌ Manual daily summary failed:', error);
      throw error;
    }
  }
}