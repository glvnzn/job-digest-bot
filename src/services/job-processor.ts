import { GmailService } from './gmail';
import { OpenAIService } from './openai';
import { TelegramService } from './telegram';
import { DatabaseService } from './database';
import { JobListing, ResumeAnalysis } from '../models/types';

export class JobProcessor {
  private gmail: GmailService;
  private openai: OpenAIService;
  private telegram: TelegramService;
  private db: DatabaseService;

  constructor() {
    this.gmail = new GmailService();
    this.openai = new OpenAIService();
    this.telegram = new TelegramService();
    this.db = new DatabaseService();
  }

  async initialize(): Promise<void> {
    await this.db.init();
    console.log('Job processor initialized');
  }

  async processJobAlerts(minRelevanceScore: number = 0.6): Promise<void> {
    try {
      console.log('Starting job alert processing...');
      
      // Get resume analysis (analyze if not exists or older than 7 days)
      let resumeAnalysis = await this.db.getLatestResumeAnalysis();
      if (!resumeAnalysis || this.isAnalysisOld(resumeAnalysis.analyzedAt)) {
        console.log('Analyzing resume...');
        resumeAnalysis = await this.analyzeResume();
        await this.db.saveResumeAnalysis(resumeAnalysis);
      }

      // Fetch recent emails and let AI classify them
      console.log('Fetching recent emails...');
      const allEmails = await this.gmail.getRecentEmails();
      console.log(`Found ${allEmails.length} recent emails`);

      // Use AI to classify which emails are job-related
      console.log('Classifying emails with AI...');
      const classifications = await this.openai.classifyEmailsBatch(allEmails);
      
      // Filter to only job-related emails with reasonable confidence
      const jobRelatedEmails = allEmails.filter(email => {
        const classification = classifications.find(c => c.id === email.id);
        return classification && classification.isJobRelated && classification.confidence >= 0.5;
      });
      
      console.log(`AI classified ${jobRelatedEmails.length} emails as job-related (out of ${allEmails.length} total)`);

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

        // Mark email as processed and delete (only delete if jobs were found)
        await this.markEmailProcessedAndDelete(email.id, jobs.length);
        console.log(`Processed ${jobs.length} jobs from email ${email.id}`);
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
    // Save to database but don't delete email
    await this.db.saveProcessedEmail({
      messageId,
      subject: '',
      from: '',
      processedAt: new Date(),
      jobsExtracted,
      deleted: false
    });
    
    console.log(`Email ${messageId} marked as processed (no jobs found, email preserved)`);
  }

  private async markEmailProcessedAndDelete(messageId: string, jobsExtracted: number): Promise<void> {
    // Save to database
    await this.db.saveProcessedEmail({
      messageId,
      subject: '',
      from: '',
      processedAt: new Date(),
      jobsExtracted,
      deleted: false
    });

    // Delete the email since it contained job opportunities
    try {
      await this.gmail.deleteEmail(messageId);
      
      // Update database to mark as deleted
      await this.db.saveProcessedEmail({
        messageId,
        subject: '',
        from: '',
        processedAt: new Date(),
        jobsExtracted,
        deleted: true
      });
      
      console.log(`Email ${messageId} processed and deleted (contained ${jobsExtracted} jobs)`);
    } catch (error) {
      console.error(`Failed to delete email ${messageId}:`, error);
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

  async cleanup(): Promise<void> {
    await this.db.close();
  }
}