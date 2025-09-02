import { GmailService } from './gmail';
import { OpenAIService } from './openai';
import { TelegramService } from './telegram';
import { DatabaseService } from './database';
import { QueueService } from './queue';
import { MarketIntelligenceService } from './market-intelligence';
import { InsightAutomationService } from './insight-automation';
import { JobListing, ResumeAnalysis } from '../models/types';

export class JobProcessor {
  private gmail: GmailService;
  private openai: OpenAIService;
  private telegram: TelegramService;
  private db: DatabaseService;
  private marketIntelligence: MarketIntelligenceService;
  private insightAutomation: InsightAutomationService;
  private queue: QueueService | null = null;

  constructor() {
    this.gmail = new GmailService();
    this.openai = new OpenAIService();
    this.telegram = new TelegramService();
    this.db = new DatabaseService();
    this.marketIntelligence = new MarketIntelligenceService();
    this.insightAutomation = new InsightAutomationService();
  }

  async initialize(): Promise<void> {
    await this.db.init();
    await this.marketIntelligence.initialize();
    await this.insightAutomation.initialize();

    // Initialize queue service
    this.queue = new QueueService(this);
    await this.queue.startWorker();

    // Connect Telegram commands to job processor
    this.telegram.setJobProcessor(this);
    this.telegram.setStatusCallback(() => this.handleStatusCommand());

    console.log('Job processor initialized');
  }

  // Public method that adds job to queue
  async processJobAlerts(minRelevanceScore: number = 0.6): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue service not initialized');
    }

    try {
      // Create initial progress message
      const progressMessageId = await this.telegram.createProgressMessage('🚀 Jobs queued');

      await this.queue.addProcessJobsJob({
        minRelevanceScore,
        triggeredBy: 'manual',
        progressMessageId: progressMessageId || undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        await this.telegram.sendStatusMessage('⏳ Already processing');
      } else {
        console.error('Failed to queue job processing:', error);
        await this.telegram.sendErrorMessage(
          `Failed to queue job processing: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  // Internal method that does the actual processing (called by worker)
  async processJobAlertsInternal(minRelevanceScore: number = 0.6, job?: any): Promise<void> {
    // Get progress message ID from job data (if provided) or create a new one
    let progressMessageId: number | null = job?.data?.progressMessageId || null;

    try {
      console.log('Starting job alert processing...');

      // If we don't have a progress message ID, create initial progress message
      if (!progressMessageId) {
        progressMessageId = await this.telegram.createProgressMessage('🚀 Processing jobs...');
      } else {
        // Update existing message to show processing started
        await this.telegram.updateProgressMessage(progressMessageId, '🚀 Processing jobs...');
      }

      // Progress: 5% - Starting
      if (job) await job.updateProgress(5, 'Initializing systems...');

      // Get resume analysis (analyze if not exists or older than 7 days)
      let resumeAnalysis = await this.db.getLatestResumeAnalysis();
      if (!resumeAnalysis || this.isAnalysisOld(resumeAnalysis.analyzedAt)) {
        console.log('Analyzing resume...');
        if (job) await job.updateProgress(10, 'Analyzing resume...');
        if (progressMessageId)
          await this.telegram.updateProgressMessage(progressMessageId, '📄 Analyzing resume...');
        resumeAnalysis = await this.analyzeResume();
        await this.db.saveResumeAnalysis(resumeAnalysis);
      }

      // Progress: 20% - Fetching emails
      if (job) await job.updateProgress(20, 'Fetching emails from Gmail...');

      // Fetch recent emails and let AI classify them
      console.log('Fetching recent emails...');
      if (progressMessageId)
        await this.telegram.updateProgressMessage(progressMessageId, '📧 Reading emails...');
      const allEmails = await this.gmail.getRecentEmails();
      console.log(`Found ${allEmails.length} recent emails`);

      // Progress: 30% - AI classification
      if (job) await job.updateProgress(30, 'Running AI email classification...');

      // Use AI to classify which emails are job-related
      console.log('Classifying emails with AI...');
      if (progressMessageId)
        await this.telegram.updateProgressMessage(
          progressMessageId,
          `🤖 Analyzing ${allEmails.length} emails...`
        );
      const classifications = await this.openai.classifyEmailsBatch(allEmails);

      // Filter to only job-related emails with reasonable confidence
      const jobRelatedEmails = allEmails.filter(email => {
        const classification = classifications.find(c => c.id === email.id);
        return classification && classification.isJobRelated && classification.confidence >= 0.5;
      });

      // Progress: 40% - Classification complete
      if (job) await job.updateProgress(40, `Found ${jobRelatedEmails.length} job-related emails`);

      console.log(
        `AI classified ${jobRelatedEmails.length} emails as job-related (out of ${allEmails.length} total)`
      );
      if (progressMessageId)
        await this.telegram.updateProgressMessage(
          progressMessageId,
          `✅ Found ${jobRelatedEmails.length} job emails`
        );


      let totalJobsProcessed = 0;
      let totalJobsSkipped = 0;
      const relevantJobs: JobListing[] = [];
      const totalEmailsToProcess = jobRelatedEmails.length;

      for (let i = 0; i < jobRelatedEmails.length; i++) {
        const email = jobRelatedEmails[i];

        // Progress: 40-80% based on email processing
        const emailProgress = 40 + Math.floor((i / totalEmailsToProcess) * 40);
        if (job)
          await job.updateProgress(
            emailProgress,
            `Processing email ${i + 1}/${totalEmailsToProcess}`
          );

        // Skip if already processed
        if (await this.db.isEmailProcessed(email.id)) {
          console.log(`Email ${email.id} already processed, skipping`);
          continue;
        }

        console.log(`Processing email: ${email.subject}`);

        try {
          // Extract jobs from email
          const jobs = await this.openai.extractJobsFromEmail(
            email.body,
            email.subject,
            email.from
          );

          if (jobs.length === 0) {
            console.log('No jobs found in email, marking as processed but NOT archiving');
            await this.markEmailAsProcessedOnly(email.id, 0);
            continue;
          }

          // Process and deduplicate jobs
          let jobsProcessedFromEmail = 0;
          let jobsSkippedFromEmail = 0;
          
          for (let jobIndex = 0; jobIndex < jobs.length; jobIndex++) {
            const currentJob = jobs[jobIndex];

            // Update progress for deduplication and analysis phase
            const jobProgress = Math.round(
              40 + ((i + jobIndex / jobs.length) / jobRelatedEmails.length) * 40
            );
            if (job) {
              await job.updateProgress(
                jobProgress,
                `Processing job ${jobIndex + 1}/${jobs.length} from email ${i + 1}/${jobRelatedEmails.length} (checking duplicates...)`
              );
            }

            // DEDUPLICATION STRATEGY 1: Check if job already exists by ID
            const jobExists = await this.db.jobExists(currentJob.id);
            if (jobExists) {
              console.log(`⚠️ Duplicate job detected (ID: ${currentJob.id}): ${currentJob.title} at ${currentJob.company} - SKIPPING`);
              jobsSkippedFromEmail++;
              totalJobsSkipped++;
              continue;
            }

            // DEDUPLICATION STRATEGY 2: Find similar jobs by content
            const similarJobs = await this.db.findSimilarJobs(
              currentJob.title,
              currentJob.company,
              currentJob.applyUrl
            );
            
            if (similarJobs.length > 0) {
              console.log(`⚠️ Similar job detected: ${currentJob.title} at ${currentJob.company} - SKIPPING (found ${similarJobs.length} similar)`);
              jobsSkippedFromEmail++;
              totalJobsSkipped++;
              continue;
            }

            // Job is unique - proceed with processing
            currentJob.emailMessageId = email.id;
            
            // Update progress for relevance calculation
            if (job) {
              await job.updateProgress(
                jobProgress,
                `Analyzing relevance for job ${jobIndex + 1}/${jobs.length} from email ${i + 1}/${jobRelatedEmails.length}`
              );
            }
            
            currentJob.relevanceScore = await this.openai.calculateJobRelevance(
              currentJob,
              resumeAnalysis
            );

            await this.db.saveJob(currentJob);
            totalJobsProcessed++;
            jobsProcessedFromEmail++;

            console.log(`✅ New job saved: ${currentJob.title} at ${currentJob.company} (Score: ${currentJob.relevanceScore.toFixed(2)})`);

            // Analyze job for market intelligence (don't wait for completion to avoid slowing down pipeline)
            this.marketIntelligence.analyzeJobDescription(currentJob).catch(error => {
              console.error(`Market intelligence analysis failed for job ${currentJob.id}:`, error);
            });

            // Collect relevant jobs for notification
            if (currentJob.relevanceScore >= minRelevanceScore) {
              relevantJobs.push(currentJob);
            }

            // Brief delay between jobs to be respectful to job sites
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          // Mark email as processed and archive (update with actual jobs processed)
          await this.markEmailProcessedAndArchive(email.id, jobsProcessedFromEmail);
          
          if (jobsSkippedFromEmail > 0) {
            console.log(`📊 Email ${email.id}: ${jobsProcessedFromEmail} new jobs, ${jobsSkippedFromEmail} duplicates skipped`);
          } else {
            console.log(`📊 Email ${email.id}: ${jobsProcessedFromEmail} jobs processed`);
          }
        } catch (emailError) {
          console.error(`Error processing email ${email.id}:`, emailError);

          // Even if processing fails, we should mark the email as read to avoid reprocessing
          // This prevents infinite retry loops on problematic emails
          try {
            await this.markEmailAsProcessedOnly(email.id, 0);
            console.log(`Marked problematic email ${email.id} as processed to prevent retry loop`);

            // Send error notification for this specific email
            await this.telegram.sendErrorMessage(
              `Failed to process email "${email.subject}" from ${email.from}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`
            );
          } catch (markError) {
            console.error(`Failed to mark email ${email.id} as processed:`, markError);
          }
        }

        // Update progress every few emails
        if ((totalJobsProcessed + totalJobsSkipped) % 10 === 0 && (totalJobsProcessed + totalJobsSkipped) > 0 && progressMessageId) {
          await this.telegram.updateProgressMessage(
            progressMessageId,
            `📈 Processing... ${totalJobsProcessed} new, ${totalJobsSkipped} skipped, ${relevantJobs.length} relevant`
          );
        }
      }

      // Progress: 85% - Sending notifications
      if (job) await job.updateProgress(85, 'Sending job notifications...');

      // Send notifications for relevant jobs
      if (relevantJobs.length > 0) {
        console.log(`Sending notifications for ${relevantJobs.length} relevant jobs`);

        // Sort by relevance score (highest first)
        relevantJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);

        await this.telegram.sendJobNotifications(relevantJobs);

        // Mark jobs as processed (notified)
        for (const job of relevantJobs) {
          await this.db.markJobAsProcessed(job.id);
        }
      } else {
        console.log('No relevant jobs found to notify');
        if ((totalJobsProcessed + totalJobsSkipped) > 0 && progressMessageId) {
          await this.telegram.updateProgressMessage(
            progressMessageId,
            `📊 ${totalJobsProcessed} new jobs, ${totalJobsSkipped} duplicates, 0 relevant`
          );
        }
      }

      // Progress: 95% - Finalizing
      if (job) await job.updateProgress(95, 'Finalizing results...');

      console.log(
        `Job processing completed. New jobs: ${totalJobsProcessed}, Duplicates skipped: ${totalJobsSkipped}, Relevant: ${relevantJobs.length}`
      );

      // Send final completion update
      const finalMessage = `✅ Complete: ${totalJobsProcessed} new, ${totalJobsSkipped} duplicates, ${relevantJobs.length} sent\n${this.getNextScanMessage()}`;
      if (progressMessageId) {
        await this.telegram.updateProgressMessage(progressMessageId, finalMessage);
        // Clean up progress history after completion
        this.telegram.cleanupProgressHistory(progressMessageId);
      } else {
        await this.telegram.sendStatusMessage(finalMessage);
      }
    } catch (error) {
      console.error('Error processing job alerts:', error);
      await this.telegram.sendErrorMessage(
        `Job processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  private async analyzeResume(): Promise<ResumeAnalysis> {
    const resumePath = './resume.pdf';
    return await this.openai.analyzeResume(resumePath);
  }

  private async markEmailAsProcessedOnly(messageId: string, jobsExtracted: number): Promise<void> {
    // Always save to database first - this is most important to prevent reprocessing
    try {
      await this.db.saveProcessedEmail({
        messageId,
        subject: '',
        from: '',
        processedAt: new Date(),
        jobsExtracted,
        deleted: false,
      });
      console.log(`Email ${messageId} saved to database as processed`);
    } catch (error) {
      console.error(`Critical error: Failed to save email ${messageId} to database:`, error);
      throw error; // This is critical - if we can't track it, it will be reprocessed
    }

    // Try to mark as read (less critical than database save)
    try {
      await this.gmail.markAsRead(messageId);
      console.log(`Email ${messageId} marked as read (no jobs found)`);
    } catch (error) {
      console.error(`Warning: Failed to mark email ${messageId} as read in Gmail:`, error);
      // Don't throw - email is already tracked in database
    }
  }

  private async markEmailProcessedAndArchive(
    messageId: string,
    jobsExtracted: number
  ): Promise<void> {
    // Always save to database first - this is most important to prevent reprocessing
    try {
      await this.db.saveProcessedEmail({
        messageId,
        subject: '',
        from: '',
        processedAt: new Date(),
        jobsExtracted,
        deleted: false,
      });
      console.log(`Email ${messageId} saved to database as processed`);
    } catch (error) {
      console.error(`Critical error: Failed to save email ${messageId} to database:`, error);
      throw error; // This is critical - if we can't track it, it will be reprocessed
    }

    // Try to mark as read and archive (less critical than database save)
    try {
      await this.gmail.markAsReadAndArchive(messageId);

      // Update database to mark as archived (only if Gmail operation succeeded)
      await this.db.saveProcessedEmail({
        messageId,
        subject: '',
        from: '',
        processedAt: new Date(),
        jobsExtracted,
        deleted: true, // We'll use this field to indicate "archived"
      });

      console.log(`Email ${messageId} processed and archived (contained ${jobsExtracted} jobs)`);
    } catch (error) {
      console.error(`Warning: Failed to archive email ${messageId} in Gmail:`, error);
      // Don't throw - email is already tracked in database as processed
      console.log(`Email ${messageId} is tracked as processed but remains in inbox`);
    }
  }

  private isAnalysisOld(analyzedAt: Date): boolean {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return analyzedAt < weekAgo;
  }

  private getCurrentManilaDate(): Date {
    const now = new Date();
    // Convert to Manila time (UTC+8)
    const manilaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    // Create a new Date object representing "today" in Manila time zone
    // Use UTC methods to create midnight Manila time, then convert back to UTC for storage
    const manilaDateAtMidnight = new Date(
      Date.UTC(manilaTime.getUTCFullYear(), manilaTime.getUTCMonth(), manilaTime.getUTCDate())
    );
    return manilaDateAtMidnight;
  }

  private getNextScanMessage(): string {
    const now = new Date();
    // Convert to Manila time to check the hour
    const manilaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const currentHourManila = manilaTime.getUTCHours();

    // Scan schedule is 6am-8pm Manila (hours 6-20)
    if (currentHourManila >= 6 && currentHourManila < 20) {
      return '⏰ Next scan in 1 hour';
    } else if (currentHourManila >= 20 && currentHourManila < 21) {
      return '🌙 Daily summary at 9 PM Manila, next scan tomorrow 6 AM Manila';
    } else {
      // Between 9 PM and 6 AM - no scans scheduled
      const hoursUntil6AM =
        currentHourManila < 6 ? 6 - currentHourManila : 24 - currentHourManila + 6;
      return `🌙 Next scan in ${hoursUntil6AM} hours (6 AM Manila)`;
    }
  }

  async testServices(): Promise<boolean> {
    try {
      console.log('Testing services...');

      const gmailOk = await this.gmail.testConnection();
      const telegramOk = await this.telegram.testConnection();

      console.log(`Gmail: ${gmailOk ? '✅' : '❌'}`);
      console.log(`Telegram: ${telegramOk ? '✅' : '❌'}`);

      return gmailOk && telegramOk;
    } catch (error) {
      console.error('Service test failed:', error);
      return false;
    }
  }

  // Public method that adds job to queue
  async sendDailySummary(): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue service not initialized');
    }

    try {
      await this.queue.addDailySummaryJob({
        triggeredBy: 'manual',
      });

      await this.telegram.sendStatusMessage('📊 Summary queued');
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        await this.telegram.sendStatusMessage('⏳ Summary already running');
      } else {
        console.error('Failed to queue daily summary:', error);
        await this.telegram.sendErrorMessage(
          `Failed to queue daily summary: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  // Internal method that does the actual summary generation (called by worker)
  async sendDailySummaryInternal(job?: any): Promise<void> {
    try {
      console.log('🌙 Generating daily summary...');

      if (job) await job.updateProgress(10, 'Fetching daily job data...');

      const today = this.getCurrentManilaDate();
      console.log(`Daily summary requested for Manila date: ${today.toISOString()}`);
      const [dailyJobs, dailyStats] = await Promise.all([
        this.db.getDailyJobSummary(today),
        this.db.getDailyStats(today),
      ]);

      if (job) await job.updateProgress(50, 'Generating summary report...');

      await this.telegram.sendDailySummary(dailyJobs, dailyStats);

      if (job) await job.updateProgress(90, 'Daily summary sent');

      console.log(
        `Daily summary sent: ${dailyJobs.length} relevant jobs, ${dailyStats.totalJobsProcessed} total processed`
      );
    } catch (error) {
      console.error('Error sending daily summary:', error);
      await this.telegram.sendErrorMessage(
        `Daily summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  // Queue methods for cron jobs (no Telegram notifications)
  async queueJobProcessing(triggeredBy: 'cron' | 'manual'): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue service not initialized');
    }

    try {
      await this.queue.addProcessJobsJob({
        minRelevanceScore: 0.6,
        triggeredBy,
      });
      console.log(`📝 Job processing queued (triggered by: ${triggeredBy})`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        console.log('⏳ Job processing already in queue or running');
      } else {
        console.error('Failed to queue job processing:', error);
        throw error;
      }
    }
  }

  async queueDailySummary(triggeredBy: 'cron' | 'manual'): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue service not initialized');
    }

    try {
      await this.queue.addDailySummaryJob({
        triggeredBy,
      });
      console.log(`📝 Daily summary queued (triggered by: ${triggeredBy})`);

      // Send notification for cron-triggered summaries too (for debugging)
      if (triggeredBy === 'cron') {
        await this.telegram.sendStatusMessage('🌙 Daily summary');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        console.log('⏳ Daily summary already in queue or running');
      } else {
        console.error('Failed to queue daily summary:', error);

        // Send error notification for failed cron summaries
        if (triggeredBy === 'cron') {
          await this.telegram.sendErrorMessage(
            `Failed to queue daily summary: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
        throw error;
      }
    }
  }

  async getQueueStatus(): Promise<any> {
    if (!this.queue) {
      return { error: 'Queue service not initialized' };
    }

    const [stats, currentJob] = await Promise.all([
      this.queue.getJobStats(),
      this.queue.getCurrentJob(),
    ]);

    return {
      stats,
      currentJob,
    };
  }

  async handleStatusCommand(): Promise<void> {
    const queueStatus = await this.getQueueStatus();

    let statusMessage = `✅ **Job Digest Bot Status**

🕐 **Schedule**: Scans 6am-8pm Manila, Summary 9pm
🔗 **URL Analysis**: Enhanced relevance scoring with job posting content
⏰ **Rate Limiting**: 1s delay between jobs (respectful crawling)`;

    if (queueStatus.error) {
      statusMessage += `\n\n❌ **Queue Error**: ${queueStatus.error}`;
    } else {
      const { stats, currentJob } = queueStatus;
      statusMessage += `\n\n📊 **Queue Status**:
• Waiting: ${stats.waiting} jobs
• Active: ${stats.active} jobs
• Completed: ${stats.completed || 0} jobs
• Failed: ${stats.failed || 0} jobs`;

      if (currentJob) {
        statusMessage += `\n\n🔄 **Currently Running**:
• Job: ${currentJob.name}
• Progress: ${currentJob.progress}%
• Details: ${currentJob.data?.progressMessage || 'Processing...'}`;
      } else {
        statusMessage += `\n\n💤 **Idle**: No jobs currently running`;
      }
    }

    await this.telegram.sendStatusMessage(statusMessage);
  }

  // Recovery method to mark orphaned emails as processed (run manually if needed)
  async markOrphanedEmailsAsProcessed(): Promise<void> {
    try {
      console.log('🔄 Checking for orphaned unread emails...');

      // Get recent emails that might be stuck
      const allEmails = await this.gmail.getRecentEmails();
      let orphanedCount = 0;

      for (const email of allEmails) {
        const isProcessed = await this.db.isEmailProcessed(email.id);

        if (!isProcessed) {
          console.log(`Found orphaned email: ${email.subject} (${email.id})`);

          // Try to process it normally first
          try {
            const jobs = await this.openai.extractJobsFromEmail(
              email.body,
              email.subject,
              email.from
            );

            if (jobs.length === 0) {
              await this.markEmailAsProcessedOnly(email.id, 0);
            } else {
              // For recovery, we'll just mark as processed without full job processing
              await this.markEmailAsProcessedOnly(email.id, jobs.length);
            }

            orphanedCount++;
            console.log(`✅ Recovered orphaned email: ${email.id}`);
          } catch (error) {
            console.error(`Failed to recover email ${email.id}:`, error);
            // Force mark as processed to prevent infinite loops
            try {
              await this.markEmailAsProcessedOnly(email.id, 0);
              orphanedCount++;
              console.log(`⚠️ Force-marked problematic email as processed: ${email.id}`);
            } catch (forceError) {
              console.error(`Critical: Could not force-mark email ${email.id}:`, forceError);
            }
          }
        }
      }

      if (orphanedCount > 0) {
        await this.telegram.sendStatusMessage(`🔄 Recovered ${orphanedCount} emails`);
      } else {
        console.log('✅ No orphaned emails found');
      }
    } catch (error) {
      console.error('Error during email recovery:', error);
      await this.telegram.sendErrorMessage(
        `Email recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Method to trigger daily insight generation
  async generateDailyInsights(): Promise<void> {
    try {
      console.log('🔄 Starting daily insight generation...');
      await this.insightAutomation.generateDailyInsights();
      console.log('✅ Daily insight generation completed');
      
      // Send notification
      await this.telegram.sendStatusMessage('📊 Daily market insights generated');
    } catch (error) {
      console.error('❌ Daily insight generation failed:', error);
      await this.telegram.sendErrorMessage(
        `Daily insight generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async cleanup(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
    await this.db.close();
    await this.marketIntelligence.cleanup();
    await this.insightAutomation.cleanup();
  }
}
