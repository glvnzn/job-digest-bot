import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GmailService } from './gmail.service';
import { OpenAIService } from './openai.service';
import { TelegramService } from './telegram.service';
import { QueueService, ProcessJobsData, DailySummaryData } from './queue.service';
import { Job, ResumeAnalysis as ResumeAnalysisEntity, ProcessedEmail } from '@job-digest-workspace/database';
import { JobListing, ResumeAnalysis, EmailClassificationResult } from './types';

@Injectable()
export class JobProcessorService {
  private readonly logger = new Logger(JobProcessorService.name);

  constructor(
    private configService: ConfigService,
    private gmailService: GmailService,
    private openaiService: OpenAIService,
    private telegramService: TelegramService,
    private queueService: QueueService,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(ResumeAnalysisEntity)
    private resumeAnalysisRepository: Repository<ResumeAnalysisEntity>,
    @InjectRepository(ProcessedEmail)
    private processedEmailRepository: Repository<ProcessedEmail>
  ) {
    // Connect Telegram commands to job processor
    this.telegramService.setJobProcessor(this);
    this.telegramService.setStatusCallback(() => this.handleStatusCommand());
  }

  async processJobAlerts(minRelevanceScore: number = 0.6): Promise<void> {
    try {
      // Create initial progress message
      const progressMessageId = await this.telegramService.createProgressMessage('🚀 Jobs queued...');

      // Add job to queue instead of processing directly
      await this.queueService.addProcessJobsJob({
        minRelevanceScore,
        triggeredBy: 'manual',
        progressMessageId: progressMessageId || undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        await this.telegramService.sendStatusMessage('⏳ Already processing');
      } else {
        this.logger.error('Failed to queue job processing:', error);
        await this.telegramService.sendErrorMessage(
          `Failed to queue job processing: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  async processJobAlertsWithProgress(
    minRelevanceScore: number = 0.6,
    progressCallback?: (progress: number, message: string) => Promise<void>,
    progressMessageId?: number
  ): Promise<void> {
    try {
      this.logger.log('Starting job alert processing...');

      // Progress: 5% - Starting
      if (progressCallback) await progressCallback(5, 'Initializing systems...');

      // Get resume analysis (analyze if not exists or older than 7 days)
      let resumeAnalysis = await this.getLatestResumeAnalysis();
      if (!resumeAnalysis || this.isAnalysisOld(resumeAnalysis.analyzedAt)) {
        this.logger.log('Analyzing resume...');
        if (progressCallback) await progressCallback(10, 'Analyzing resume...');
        if (progressMessageId)
          await this.telegramService.updateProgressMessage(progressMessageId, '📄 Analyzing resume...');
        resumeAnalysis = await this.analyzeResume();
        await this.saveResumeAnalysis(resumeAnalysis);
      }

      // Progress: 20% - Fetching emails
      if (progressCallback) await progressCallback(20, 'Fetching emails from Gmail...');

      // Fetch recent emails and let AI classify them
      this.logger.log('Fetching recent emails...');
      if (progressMessageId)
        await this.telegramService.updateProgressMessage(progressMessageId, '📧 Reading emails...');
      const allEmails = await this.gmailService.getRecentEmails();
      this.logger.log(`Found ${allEmails.length} recent emails`);

      // Progress: 30% - AI classification
      if (progressCallback) await progressCallback(30, 'Running AI email classification...');

      // Use AI to classify which emails are job-related
      this.logger.log('Classifying emails with AI...');
      if (progressMessageId)
        await this.telegramService.updateProgressMessage(
          progressMessageId,
          `🤖 Analyzing ${allEmails.length} emails...`
        );
      const classifications = await this.openaiService.classifyEmailsBatch(allEmails);

      // Filter to only job-related emails with reasonable confidence
      const jobRelatedEmails = allEmails.filter((email) => {
        const classification = classifications.find((c) => c.id === email.id);
        return classification && classification.isJobRelated && classification.confidence >= 0.5;
      });

      this.logger.log(
        `AI classified ${jobRelatedEmails.length} emails as job-related (out of ${allEmails.length} total)`
      );
      if (progressMessageId)
        await this.telegramService.updateProgressMessage(
          progressMessageId,
          `✅ Found ${jobRelatedEmails.length} job emails`
        );

      let totalJobsProcessed = 0;
      const relevantJobs: JobListing[] = [];
      const totalEmailsToProcess = jobRelatedEmails.length;

      for (let i = 0; i < jobRelatedEmails.length; i++) {
        const email = jobRelatedEmails[i];

        // Skip if already processed
        if (await this.isEmailProcessed(email.id)) {
          this.logger.log(`Email ${email.id} already processed, skipping`);
          continue;
        }

        this.logger.log(`Processing email: ${email.subject}`);

        try {
          this.logger.log(`Processing email ${i + 1}/${totalEmailsToProcess}: "${email.subject}" from ${email.from}`);
          
          // Extract jobs from email
          const jobs = await this.openaiService.extractJobsFromEmail(
            email.body,
            email.subject,
            email.from
          );
          
          this.logger.log(`Extracted ${jobs.length} jobs from email "${email.subject}"`);

          if (jobs.length === 0) {
            this.logger.log('No jobs found in email, marking as processed but NOT archiving');
            await this.markEmailAsProcessedOnly(email.id, 0);
            continue;
          }

          // Calculate relevance scores and save jobs
          for (let jobIndex = 0; jobIndex < jobs.length; jobIndex++) {
            const currentJob = jobs[jobIndex];

            currentJob.emailMessageId = email.id;
            currentJob.relevanceScore = await this.openaiService.calculateJobRelevance(
              currentJob,
              resumeAnalysis
            );

            await this.saveJob(currentJob);
            totalJobsProcessed++;

            // Collect relevant jobs for notification
            if (currentJob.relevanceScore >= minRelevanceScore) {
              relevantJobs.push(currentJob);
            }

            // Brief delay between jobs to be respectful to job sites
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          // Mark email as processed and archive (only archive if jobs were found)
          await this.markEmailProcessedAndArchive(email.id, jobs.length);
          this.logger.log(`Processed ${jobs.length} jobs from email ${email.id}`);
        } catch (emailError) {
          this.logger.error(`Error processing email ${email.id} ("${email.subject}"):`, emailError);
          this.logger.error('Error details:', {
            message: emailError instanceof Error ? emailError.message : String(emailError),
            stack: emailError instanceof Error ? emailError.stack : undefined,
            emailFrom: email.from,
            emailSubject: email.subject
          });

          // Even if processing fails, we should mark the email as read to avoid reprocessing
          try {
            await this.markEmailAsProcessedOnly(email.id, 0);
            this.logger.log(`Marked problematic email ${email.id} as processed to prevent retry loop`);

            // Send error notification for this specific email
            await this.telegramService.sendErrorMessage(
              `Failed to process email "${email.subject}" from ${email.from}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`
            );
          } catch (markError) {
            this.logger.error(`Failed to mark email ${email.id} as processed:`, markError);
          }
        }

        // Update progress every few emails
        if (totalJobsProcessed % 10 === 0 && totalJobsProcessed > 0) {
          const emailProgress = 40 + Math.floor((i / totalEmailsToProcess) * 40);
          if (progressCallback) await progressCallback(emailProgress, `Processing... ${totalJobsProcessed} jobs, ${relevantJobs.length} relevant`);
          if (progressMessageId) {
            await this.telegramService.updateProgressMessage(
              progressMessageId,
              `📈 Processing... ${totalJobsProcessed} jobs, ${relevantJobs.length} relevant`
            );
          }
        }
      }

      // Progress: 85% - Sending notifications
      if (progressCallback) await progressCallback(85, 'Sending job notifications...');

      // Send notifications for relevant jobs
      if (relevantJobs.length > 0) {
        this.logger.log(`Sending notifications for ${relevantJobs.length} relevant jobs`);

        // Sort by relevance score (highest first)
        relevantJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);

        await this.telegramService.sendJobNotifications(relevantJobs);

        // Mark jobs as processed (notified)
        for (const job of relevantJobs) {
          await this.markJobAsProcessed(job.id);
        }
      } else {
        this.logger.log('No relevant jobs found to notify');
        if (totalJobsProcessed > 0 && progressMessageId) {
          await this.telegramService.updateProgressMessage(
            progressMessageId,
            `📊 Processed ${totalJobsProcessed} jobs, 0 relevant`
          );
        }
      }

      this.logger.log(
        `Job processing completed. Total jobs: ${totalJobsProcessed}, Relevant: ${relevantJobs.length}`
      );

      // Send final completion update
      const finalMessage = `✅ Complete: ${totalJobsProcessed} jobs, ${relevantJobs.length} sent\n${this.getNextScanMessage()}`;
      if (progressMessageId) {
        await this.telegramService.updateProgressMessage(progressMessageId, finalMessage);
        // Clean up progress history after completion
        this.telegramService.cleanupProgressHistory(progressMessageId);
      } else {
        await this.telegramService.sendStatusMessage(finalMessage);
      }
    } catch (error) {
      this.logger.error('Error processing job alerts:', error);
      await this.telegramService.sendErrorMessage(
        `Job processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async sendDailySummary(): Promise<void> {
    try {
      // Add job to queue instead of processing directly
      await this.queueService.addDailySummaryJob({
        triggeredBy: 'manual',
      });

      await this.telegramService.sendStatusMessage('📊 Summary queued');
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in queue')) {
        await this.telegramService.sendStatusMessage('⏳ Summary already running');
      } else {
        this.logger.error('Failed to queue daily summary:', error);
        await this.telegramService.sendErrorMessage(
          `Failed to queue daily summary: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  async sendDailySummaryWithProgress(
    progressCallback?: (progress: number, message: string) => Promise<void>
  ): Promise<void> {
    try {
      this.logger.log('🌙 Generating daily summary...');

      if (progressCallback) await progressCallback(10, 'Fetching daily job data...');

      const today = this.getCurrentManilaDate();
      this.logger.log(`Daily summary requested for Manila date: ${today.toISOString()}`);
      
      const [dailyJobs, dailyStats] = await Promise.all([
        this.getDailyJobSummary(today),
        this.getDailyStats(today),
      ]);

      if (progressCallback) await progressCallback(50, 'Generating summary report...');

      await this.telegramService.sendDailySummary(dailyJobs, dailyStats);

      if (progressCallback) await progressCallback(90, 'Daily summary sent');

      this.logger.log(
        `Daily summary sent: ${dailyJobs.length} relevant jobs, ${dailyStats.totalJobsProcessed} total processed`
      );
    } catch (error) {
      this.logger.error('Error sending daily summary:', error);
      await this.telegramService.sendErrorMessage(
        `Daily summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  private async analyzeResume(): Promise<ResumeAnalysis> {
    const resumePath = '/Users/glevinzon/projects/pet-projects/job-digest-bot/job-digest-workspace/resume.pdf';
    return await this.openaiService.analyzeResume(resumePath);
  }

  private async getLatestResumeAnalysis(): Promise<ResumeAnalysis | null> {
    try {
      const latest = await this.resumeAnalysisRepository.findOne({
        where: {},
        order: { analyzedAt: 'DESC' }
      });

      if (!latest) return null;

      return {
        skills: latest.skills,
        experience: latest.experience,
        preferredRoles: latest.preferredRoles,
        seniority: latest.seniority,
        analyzedAt: latest.analyzedAt,
      };
    } catch (error) {
      // If resume_analysis table doesn't exist or has schema issues, return null to trigger new analysis
      console.log('Resume analysis table not found or has schema issues, will create new analysis');
      return null;
    }
  }

  private async saveResumeAnalysis(analysis: ResumeAnalysis): Promise<void> {
    try {
      const entity = this.resumeAnalysisRepository.create({
        skills: analysis.skills,
        experience: analysis.experience,
        preferredRoles: analysis.preferredRoles,
        seniority: analysis.seniority,
        analyzedAt: analysis.analyzedAt,
      });

      await this.resumeAnalysisRepository.save(entity);
    } catch (error) {
      console.log('Failed to save resume analysis (table schema issue), continuing without database cache:', error);
      // Continue processing without saving - this is not critical
    }
  }

  private async isEmailProcessed(messageId: string): Promise<boolean> {
    try {
      const processed = await this.processedEmailRepository.findOne({
        where: { messageId }
      });
      return !!processed;
    } catch (error) {
      // If processed_emails table doesn't exist or has schema issues, assume email is not processed
      console.log('ProcessedEmail table not found or has schema issues, assuming email not processed');
      return false;
    }
  }

  private async saveJob(job: JobListing): Promise<void> {
    try {
      const entity = this.jobRepository.create({
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote: job.isRemote,
        description: job.description,
        requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : job.requirements || '',
        applyUrl: job.applyUrl,
        source: job.source,
        relevanceScore: job.relevanceScore,
        emailMessageId: job.emailMessageId,
        processed: job.processed,
      });

      await this.jobRepository.save(entity);
      this.logger.log(`Successfully saved job: ${job.title} at ${job.company}`);
    } catch (error) {
      this.logger.error('Failed to save job to database:', error);
      // Continue processing without saving - this is not critical for notifications
    }
  }

  private async markJobAsProcessed(jobId: string): Promise<void> {
    try {
      // Since the entity uses auto-generated numeric IDs, we need to find by string ID
      // For now, we'll update all jobs for this email (which is what we want anyway)
      await this.jobRepository.update({ emailMessageId: jobId }, { processed: true });
    } catch (error) {
      console.log('Failed to mark job as processed in database (table schema issue), continuing:', error);
      // Continue processing - this is not critical
    }
  }

  private async markEmailAsProcessedOnly(messageId: string, jobsExtracted: number): Promise<void> {
    // Always save to database first - this is most important to prevent reprocessing
    try {
      const entity = this.processedEmailRepository.create({
        messageId,
        subject: '',
        from: '',
        jobsExtracted,
        deleted: false,
      });

      await this.processedEmailRepository.save(entity);
      this.logger.log(`Email ${messageId} saved to database as processed`);
    } catch (error) {
      this.logger.error(`Critical error: Failed to save email ${messageId} to database:`, error);
      throw error; // This is critical - if we can't track it, it will be reprocessed
    }

    // Try to mark as read (less critical than database save)
    try {
      await this.gmailService.markAsRead(messageId);
      this.logger.log(`Email ${messageId} marked as read (no jobs found)`);
    } catch (error) {
      this.logger.error(`Warning: Failed to mark email ${messageId} as read in Gmail:`, error);
      // Don't throw - email is already tracked in database
    }
  }

  private async markEmailProcessedAndArchive(messageId: string, jobsExtracted: number): Promise<void> {
    // Always save to database first - this is most important to prevent reprocessing
    try {
      const entity = this.processedEmailRepository.create({
        messageId,
        subject: '',
        from: '',
        jobsExtracted,
        deleted: false,
      });

      await this.processedEmailRepository.save(entity);
      this.logger.log(`Email ${messageId} saved to database as processed`);
    } catch (error) {
      this.logger.error(`Critical error: Failed to save email ${messageId} to database:`, error);
      throw error; // This is critical - if we can't track it, it will be reprocessed
    }

    // Try to mark as read and archive (less critical than database save)
    try {
      await this.gmailService.markAsReadAndArchive(messageId);

      // Update database to mark as archived (only if Gmail operation succeeded)
      await this.processedEmailRepository.update(
        { messageId },
        { deleted: true }
      );

      this.logger.log(`Email ${messageId} processed and archived (contained ${jobsExtracted} jobs)`);
    } catch (error) {
      this.logger.error(`Warning: Failed to archive email ${messageId} in Gmail:`, error);
      // Don't throw - email is already tracked in database as processed
      this.logger.log(`Email ${messageId} is tracked as processed but remains in inbox`);
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
    return new Date(manilaTime.getUTCFullYear(), manilaTime.getUTCMonth(), manilaTime.getUTCDate());
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

  private async getDailyJobSummary(date: Date): Promise<JobListing[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const jobs = await this.jobRepository
        .createQueryBuilder('job')
        .where('job.createdAt >= :startOfDay', { startOfDay })
        .andWhere('job.createdAt <= :endOfDay', { endOfDay })
        .andWhere('job.relevanceScore >= :minScore', { minScore: 0.6 })
        .orderBy('job.relevanceScore', 'DESC')
        .getMany();

      return jobs.map(job => ({
        id: job.id.toString(), // Convert to string for interface compatibility
        title: job.title,
        company: job.company,
        location: job.location || '',
        isRemote: job.isRemote,
        description: job.description || '',
        requirements: job.requirements ? job.requirements.split('\n') : [], // Convert back to array
        applyUrl: job.applyUrl || '',
        salary: undefined, // Not in entity anymore
        postedDate: new Date(), // Use createdAt as placeholder
        source: job.source || '',
        relevanceScore: Number(job.relevanceScore),
        emailMessageId: job.emailMessageId,
        processed: job.processed,
        createdAt: job.createdAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get daily job summary from database:', error);
      return [];
    }
  }

  private async getDailyStats(date: Date): Promise<{
    totalJobsProcessed: number;
    relevantJobs: number;
    emailsProcessed: number;
    topSources: Array<{ source: string; count: number }>;
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const [totalJobs, relevantJobs, processedEmails] = await Promise.all([
        this.jobRepository
          .createQueryBuilder('job')
          .where('job.createdAt >= :startOfDay', { startOfDay })
          .andWhere('job.createdAt <= :endOfDay', { endOfDay })
          .getCount(),
        this.jobRepository
          .createQueryBuilder('job')
          .where('job.createdAt >= :startOfDay', { startOfDay })
          .andWhere('job.createdAt <= :endOfDay', { endOfDay })
          .andWhere('job.relevanceScore >= :minScore', { minScore: 0.6 })
          .getCount(),
        this.processedEmailRepository
          .createQueryBuilder('email')
          .where('email.processedAt >= :startOfDay', { startOfDay })
          .andWhere('email.processedAt <= :endOfDay', { endOfDay })
          .getCount(),
      ]);

      // Get top sources
      const jobs = await this.jobRepository
        .createQueryBuilder('job')
        .where('job.createdAt >= :startOfDay', { startOfDay })
        .andWhere('job.createdAt <= :endOfDay', { endOfDay })
        .getMany();

      const sourceCounts = jobs.reduce((acc, job) => {
        const source = job.source || 'Unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topSources = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalJobsProcessed: totalJobs,
        relevantJobs,
        emailsProcessed: processedEmails,
        topSources,
      };
    } catch (error) {
      this.logger.error('Failed to get daily stats from database:', error);
      return {
        totalJobsProcessed: 0,
        relevantJobs: 0,
        emailsProcessed: 0,
        topSources: [],
      };
    }
  }

  async testServices(): Promise<boolean> {
    try {
      this.logger.log('Testing services...');

      const gmailOk = await this.gmailService.testConnection();
      const telegramOk = await this.telegramService.testConnection();

      this.logger.log(`Gmail: ${gmailOk ? '✅' : '❌'}`);
      this.logger.log(`Telegram: ${telegramOk ? '✅' : '❌'}`);

      return gmailOk && telegramOk;
    } catch (error) {
      this.logger.error('Service test failed:', error);
      return false;
    }
  }

  async getQueueStatus(): Promise<any> {
    try {
      const [stats, currentJob] = await Promise.all([
        this.queueService.getJobStats(),
        this.queueService.getCurrentJob(),
      ]);

      return {
        stats,
        currentJob,
      };
    } catch (error) {
      return { error: 'Queue service not available' };
    }
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

    await this.telegramService.sendStatusMessage(statusMessage);
  }
}