import { DatabaseService } from './database';
import { TelegramService } from './telegram';

export class JobCleanupService {
  private databaseService: DatabaseService;
  private telegramService?: TelegramService;

  constructor(telegramService?: TelegramService) {
    this.databaseService = new DatabaseService();
    this.telegramService = telegramService;
  }

  /**
   * Clean up old untracked jobs
   * Deletes jobs that are:
   * 1. Older than the specified number of days (default: 3 days)
   * 2. Not tracked by any user (not in user_jobs table)
   * 3. Not marked as processed for analysis
   */
  async cleanupOldUntrackedJobs(olderThanDays: number = 3): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    console.log(`🧹 Starting job cleanup: removing untracked jobs older than ${olderThanDays} days (before ${cutoffDate.toISOString()})`);

    const errors: string[] = [];
    let deletedCount = 0;

    try {
      // Get jobs that are candidates for deletion
      const jobsToDelete = await this.databaseService.getOldUntrackedJobs(cutoffDate);

      console.log(`📊 Found ${jobsToDelete.length} jobs eligible for cleanup`);

      if (jobsToDelete.length === 0) {
        console.log('✅ No jobs to clean up');
        return { deletedCount: 0, errors: [] };
      }

      // Log summary before deletion
      const sourceSummary = jobsToDelete.reduce((acc, job) => {
        acc[job.source] = (acc[job.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📋 Jobs to be deleted by source:', sourceSummary);

      // Delete jobs in batches to avoid overwhelming the database
      const batchSize = 50;
      const totalBatches = Math.ceil(jobsToDelete.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = jobsToDelete.slice(i * batchSize, (i + 1) * batchSize);
        const batchIds = batch.map(job => job.id);

        try {
          console.log(`🗑️ Deleting batch ${i + 1}/${totalBatches} (${batch.length} jobs)`);

          const batchDeletedCount = await this.databaseService.deleteJobsByIds(batchIds);
          deletedCount += batchDeletedCount;

          // Small delay between batches to be gentle on the database
          if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          const errorMsg = `Failed to delete batch ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`✅ Job cleanup completed: ${deletedCount} jobs deleted`);

      // Log final statistics
      if (deletedCount > 0) {
        console.log(`📈 Cleanup statistics:
          - Total jobs deleted: ${deletedCount}
          - Cutoff date: ${cutoffDate.toISOString()}
          - Sources cleaned: ${Object.keys(sourceSummary).join(', ')}
          - Errors encountered: ${errors.length}`);
      }

      return { deletedCount, errors };

    } catch (error) {
      const errorMsg = `Job cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);

      return { deletedCount, errors };
    }
  }

  /**
   * Get cleanup statistics without actually deleting anything
   */
  async getCleanupPreview(olderThanDays: number = 3): Promise<{
    totalJobs: number;
    jobsBySource: Record<string, number>;
    oldestJob?: {
      id: string;
      title: string;
      company: string;
      source: string;
      createdAt: Date;
    };
    cutoffDate: Date;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    console.log(`📊 Getting cleanup preview for jobs older than ${olderThanDays} days`);

    try {
      const jobsToDelete = await this.databaseService.getOldUntrackedJobs(cutoffDate);

      const jobsBySource = jobsToDelete.reduce((acc, job) => {
        acc[job.source] = (acc[job.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Find the oldest job
      const oldestJob = jobsToDelete.length > 0
        ? jobsToDelete.reduce((oldest, current) =>
            current.createdAt < oldest.createdAt ? current : oldest
          )
        : undefined;

      return {
        totalJobs: jobsToDelete.length,
        jobsBySource,
        oldestJob: oldestJob ? {
          id: oldestJob.id,
          title: oldestJob.title,
          company: oldestJob.company,
          source: oldestJob.source,
          createdAt: oldestJob.createdAt
        } : undefined,
        cutoffDate
      };

    } catch (error) {
      console.error('❌ Failed to get cleanup preview:', error);
      throw error;
    }
  }

  /**
   * Clean up related data that might be orphaned
   */
  async cleanupOrphanedData(): Promise<{
    cleanedInsights: number;
    cleanedEmails: number;
    errors: string[];
  }> {
    console.log('🧹 Starting orphaned data cleanup');

    const errors: string[] = [];
    let cleanedInsights = 0;
    let cleanedEmails = 0;

    try {
      // Clean up job insights for deleted jobs
      cleanedInsights = await this.databaseService.cleanupOrphanedJobInsights();
      console.log(`🗑️ Cleaned up ${cleanedInsights} orphaned job insights`);

      // Clean up processed emails older than 30 days (keep recent ones for deduplication)
      const emailCutoffDate = new Date();
      emailCutoffDate.setDate(emailCutoffDate.getDate() - 30);
      cleanedEmails = await this.databaseService.cleanupOldProcessedEmails(emailCutoffDate);
      console.log(`📧 Cleaned up ${cleanedEmails} old processed email records`);

    } catch (error) {
      const errorMsg = `Orphaned data cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    return { cleanedInsights, cleanedEmails, errors };
  }

  /**
   * Run a complete cleanup cycle
   */
  async runFullCleanup(jobRetentionDays: number = 3): Promise<{
    jobsDeleted: number;
    insightsDeleted: number;
    emailsDeleted: number;
    totalErrors: string[];
    duration: number;
  }> {
    const startTime = Date.now();
    console.log('🚀 Starting full cleanup cycle');

    const allErrors: string[] = [];

    // Clean up old jobs
    const jobCleanup = await this.cleanupOldUntrackedJobs(jobRetentionDays);
    allErrors.push(...jobCleanup.errors);

    // Clean up orphaned data
    const orphanedCleanup = await this.cleanupOrphanedData();
    allErrors.push(...orphanedCleanup.errors);

    const duration = Date.now() - startTime;

    const result = {
      jobsDeleted: jobCleanup.deletedCount,
      insightsDeleted: orphanedCleanup.cleanedInsights,
      emailsDeleted: orphanedCleanup.cleanedEmails,
      totalErrors: allErrors,
      duration
    };

    console.log(`✅ Full cleanup completed in ${duration}ms:
      - Jobs deleted: ${result.jobsDeleted}
      - Insights cleaned: ${result.insightsDeleted}
      - Email records cleaned: ${result.emailsDeleted}
      - Total errors: ${result.totalErrors.length}`);

    // Send Telegram notification if service is available
    if (this.telegramService) {
      try {
        const telegramMessage = `🧹 **Daily Cleanup Summary**

📊 **Results:**
• Jobs deleted: ${result.jobsDeleted}
• Insights cleaned: ${result.insightsDeleted}
• Email records cleaned: ${result.emailsDeleted}
• Duration: ${Math.round(duration / 1000)}s

${result.totalErrors.length > 0
  ? `⚠️ **Errors:** ${result.totalErrors.length}\n${result.totalErrors.slice(0, 3).map(e => `• ${e}`).join('\n')}`
  : '✅ **Status:** All operations successful'
}`;

        await this.telegramService.sendStatusMessage(telegramMessage);
      } catch (error) {
        console.error('Failed to send cleanup notification to Telegram:', error);
      }
    }

    return result;
  }
}