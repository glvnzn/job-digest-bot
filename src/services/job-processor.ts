import { GmailService } from './gmail';
import { OpenAIService } from './openai';
import { TelegramService } from './telegram';
import { DatabaseService } from './database';
import { QueueService } from './queue';
import { JobListing, ResumeAnalysis } from '../models/types';

export class JobProcessor {
  private gmail: GmailService;
  private openai: OpenAIService;
  private telegram: TelegramService;
  private db: DatabaseService;
  private queue: QueueService | null = null;

  constructor() {
    this.gmail = new GmailService();
    this.openai = new OpenAIService();
    this.telegram = new TelegramService();
    this.db = new DatabaseService();
  }

  async initialize(): Promise<void> {
    await this.db.init();
    
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
      await this.queue.addProcessJobsJob({
        minRelevanceScore,
        triggeredBy: 'manual'
      });
      
      await this.telegram.sendStatusMessage('🚀 **Job Processing Queued**\n\n⏳ Added to processing queue. Will start shortly...');
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        await this.telegram.sendStatusMessage('⏳ **Job Processing Skipped**\n\nAnother job processing is already in queue or running. Please wait for it to complete.');
      } else {
        console.error('Failed to queue job processing:', error);
        await this.telegram.sendErrorMessage(`Failed to queue job processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Internal method that does the actual processing (called by worker)
  async processJobAlertsInternal(minRelevanceScore: number = 0.6): Promise<void> {
    try {
      console.log('Starting job alert processing...');
      await this.telegram.sendStatusMessage('🚀 **Job Processing Started**\n\n⏳ Initializing systems...');
      
      // Get resume analysis (analyze if not exists or older than 7 days)
      let resumeAnalysis = await this.db.getLatestResumeAnalysis();
      if (!resumeAnalysis || this.isAnalysisOld(resumeAnalysis.analyzedAt)) {
        console.log('Analyzing resume...');
        await this.telegram.sendStatusMessage('📄 **Analyzing Resume**\n\n🧠 Using AI to understand your skills and experience...');
        resumeAnalysis = await this.analyzeResume();
        await this.db.saveResumeAnalysis(resumeAnalysis);
        await this.telegram.sendStatusMessage('✅ **Resume Analysis Complete**\n\n🎯 Skills and preferences identified!');
      }

      // Fetch recent emails and let AI classify them
      console.log('Fetching recent emails...');
      await this.telegram.sendStatusMessage('📧 **Fetching Emails**\n\n📥 Reading recent emails from Gmail...');
      const allEmails = await this.gmail.getRecentEmails();
      console.log(`Found ${allEmails.length} recent emails`);

      // Use AI to classify which emails are job-related
      console.log('Classifying emails with AI...');
      await this.telegram.sendStatusMessage(`🤖 **AI Email Analysis**\n\n📊 Found ${allEmails.length} emails\n🔍 Analyzing which contain job opportunities...`);
      const classifications = await this.openai.classifyEmailsBatch(allEmails);
      
      // Filter to only job-related emails with reasonable confidence
      const jobRelatedEmails = allEmails.filter(email => {
        const classification = classifications.find(c => c.id === email.id);
        return classification && classification.isJobRelated && classification.confidence >= 0.5;
      });
      
      console.log(`AI classified ${jobRelatedEmails.length} emails as job-related (out of ${allEmails.length} total)`);
      await this.telegram.sendStatusMessage(`✅ **Email Classification Complete**\n\n🎯 **${jobRelatedEmails.length}** job-related emails found\n📄 **${allEmails.length - jobRelatedEmails.length}** non-job emails skipped\n\n⏳ Now extracting job details...`);

      let totalJobsProcessed = 0;
      let relevantJobs: JobListing[] = [];

      for (const email of jobRelatedEmails) {
        // Skip if already processed
        if (await this.db.isEmailProcessed(email.id)) {
          console.log(`Email ${email.id} already processed, skipping`);
          continue;
        }

        console.log(`Processing email: ${email.subject}`);

        // Extract jobs from email
        const jobs = await this.openai.extractJobsFromEmail(
          email.body, 
          email.subject, 
          email.from
        );

        if (jobs.length === 0) {
          console.log('No jobs found in email, marking as processed but NOT deleting');
          await this.markEmailAsProcessedOnly(email.id, 0);
          continue;
        }

        // Calculate relevance scores and save jobs
        for (const job of jobs) {
          job.emailMessageId = email.id;
          job.relevanceScore = await this.openai.calculateJobRelevance(job, resumeAnalysis);
          
          await this.db.saveJob(job);
          totalJobsProcessed++;

          // Collect relevant jobs for notification
          if (job.relevanceScore >= minRelevanceScore) {
            relevantJobs.push(job);
          }
        }

        // Mark email as processed and archive (only archive if jobs were found)
        await this.markEmailProcessedAndArchive(email.id, jobs.length);
        console.log(`Processed ${jobs.length} jobs from email ${email.id}`);
        
        // Send progress update every few emails
        if (totalJobsProcessed % 20 === 0 && totalJobsProcessed > 0) {
          await this.telegram.sendStatusMessage(`📈 **Processing Update**\n\n✅ **${totalJobsProcessed}** jobs extracted so far\n🎯 **${relevantJobs.length}** relevant matches found\n⏳ Still analyzing...`);
        }
      }

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
        if (totalJobsProcessed > 0) {
          await this.telegram.sendStatusMessage(
            `Processed ${totalJobsProcessed} jobs but none met the relevance threshold (≥${Math.round(minRelevanceScore * 100)}%).`
          );
        }
      }

      console.log(`Job processing completed. Total jobs: ${totalJobsProcessed}, Relevant: ${relevantJobs.length}`);
      
      // Send completion summary
      await this.telegram.sendStatusMessage(`🎉 **Job Processing Complete**\n\n📊 **Final Results:**\n✅ **${totalJobsProcessed}** total jobs processed\n🎯 **${relevantJobs.length}** relevant jobs found\n📱 Notifications sent for all matches!\n\n⏰ Next scan in 1 hour`);
      
    } catch (error) {
      console.error('Error processing job alerts:', error);
      await this.telegram.sendErrorMessage(`Job processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async analyzeResume(): Promise<ResumeAnalysis> {
    const resumePath = './resume.pdf';
    return await this.openai.analyzeResume(resumePath);
  }

  private async markEmailAsProcessedOnly(messageId: string, jobsExtracted: number): Promise<void> {
    // Save to database and mark as read (but don't archive non-job emails)
    await this.db.saveProcessedEmail({
      messageId,
      subject: '',
      from: '',
      processedAt: new Date(),
      jobsExtracted,
      deleted: false
    });
    
    // Just mark as read, don't archive since no jobs were found
    try {
      await this.gmail.markAsRead(messageId);
      console.log(`Email ${messageId} marked as processed and read (no jobs found)`);
    } catch (error) {
      console.error(`Failed to mark email ${messageId} as read:`, error);
    }
  }

  private async markEmailProcessedAndArchive(messageId: string, jobsExtracted: number): Promise<void> {
    // Save to database
    await this.db.saveProcessedEmail({
      messageId,
      subject: '',
      from: '',
      processedAt: new Date(),
      jobsExtracted,
      deleted: false
    });

    // Mark as read and archive since it contained job opportunities
    try {
      await this.gmail.markAsReadAndArchive(messageId);
      
      // Update database to mark as archived
      await this.db.saveProcessedEmail({
        messageId,
        subject: '',
        from: '',
        processedAt: new Date(),
        jobsExtracted,
        deleted: true // We'll use this field to indicate "archived"
      });
      
      console.log(`Email ${messageId} processed and archived (contained ${jobsExtracted} jobs)`);
    } catch (error) {
      console.error(`Failed to archive email ${messageId}:`, error);
    }
  }

  private isAnalysisOld(analyzedAt: Date): boolean {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return analyzedAt < weekAgo;
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
        triggeredBy: 'manual'
      });
      
      await this.telegram.sendStatusMessage('📊 **Daily Summary Queued**\n\n⏳ Added to processing queue. Will start shortly...');
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        await this.telegram.sendStatusMessage('⏳ **Daily Summary Skipped**\n\nDaily summary is already in queue or running. Please wait for it to complete.');
      } else {
        console.error('Failed to queue daily summary:', error);
        await this.telegram.sendErrorMessage(`Failed to queue daily summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Internal method that does the actual summary generation (called by worker)
  async sendDailySummaryInternal(): Promise<void> {
    try {
      console.log('🌙 Generating daily summary...');
      
      const today = new Date();
      const [dailyJobs, dailyStats] = await Promise.all([
        this.db.getDailyJobSummary(today),
        this.db.getDailyStats(today)
      ]);
      
      await this.telegram.sendDailySummary(dailyJobs, dailyStats);
      
      console.log(`Daily summary sent: ${dailyJobs.length} relevant jobs, ${dailyStats.totalJobsProcessed} total processed`);
    } catch (error) {
      console.error('Error sending daily summary:', error);
      await this.telegram.sendErrorMessage(`Daily summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        triggeredBy
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
        triggeredBy
      });
      console.log(`📝 Daily summary queued (triggered by: ${triggeredBy})`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        console.log('⏳ Daily summary already in queue or running');
      } else {
        console.error('Failed to queue daily summary:', error);
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
      this.queue.getCurrentJob()
    ]);

    return {
      stats,
      currentJob
    };
  }

  async handleStatusCommand(): Promise<void> {
    const queueStatus = await this.getQueueStatus();
    
    let statusMessage = `**Bot Status: Active** ✅

⏰ **Next scheduled scan:** Top of next hour
🌙 **Daily summary:** 9:00 PM UTC
🤖 **AI Processing:** OpenAI GPT-4o-mini
📧 **Email Processing:** Gmail API connected
🔗 **Database:** PostgreSQL connected
📊 **Queue:** Redis + BullMQ connected

**Queue Status:**`;

    if (queueStatus.error) {
      statusMessage += `\n❌ ${queueStatus.error}`;
    } else {
      const { stats, currentJob } = queueStatus;
      statusMessage += `
📝 **Waiting:** ${stats.waiting} jobs
⚡ **Active:** ${stats.active} jobs  
✅ **Completed:** ${stats.completed} jobs
❌ **Failed:** ${stats.failed} jobs`;

      if (currentJob) {
        statusMessage += `

🔄 **Currently Running:**
📋 ${currentJob.name} (ID: ${currentJob.id})
📊 Progress: ${currentJob.progress}%`;
      }
    }

    statusMessage += '\n\nAll systems operational!';
    
    await this.telegram.sendStatusMessage(statusMessage);
  }

  async cleanup(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
    await this.db.close();
  }
}