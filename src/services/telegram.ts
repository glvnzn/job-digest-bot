import TelegramBot from 'node-telegram-bot-api';
import { JobListing } from '../models/types';

export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;
  private statusCallback?: () => Promise<void>;

  constructor() {
    // Enable polling for Railway deployment (webhooks are complex to set up)
    const enablePolling = true;
    console.log(`🤖 Telegram bot starting with polling: ${enablePolling}`);

    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: enablePolling });
    this.chatId = process.env.TELEGRAM_CHAT_ID!;

    console.log('📱 Setting up Telegram commands...');
    this.setupCommands();

    // Add error handling for polling
    this.bot.on('polling_error', (error) => {
      console.error('🚨 Telegram polling error:', error);
    });
  }

  private setupCommands(): void {
    // Set bot commands for better UX
    this.bot.setMyCommands([
      { command: 'start', description: 'Start the job digest bot' },
      { command: 'process', description: 'Manually trigger job processing' },
      { command: 'summary', description: "Get today's summary" },
      { command: 'status', description: 'Check bot status' },
      { command: 'help', description: 'Show available commands' },
    ]);

    // Handle commands
    this.bot.onText(/\/start/, (msg) => {
      if (msg.chat.id.toString() === this.chatId) {
        this.sendMessage(`🤖 **Job Digest Bot Started!**

🔍 I'll automatically scan your emails every hour and send you relevant job opportunities.

**Available Commands:**
/process - Manually trigger job processing
/summary - Get today's job summary  
/status - Check bot status
/help - Show this help message

✨ Set up complete! You'll receive notifications when relevant jobs are found.`);
      }
    });

    this.bot.onText(/\/help/, (msg) => {
      if (msg.chat.id.toString() === this.chatId) {
        this.sendMessage(`🤖 **Job Digest Bot Help**

**Available Commands:**
/process - Manually trigger job processing
/summary - Get today's job summary
/status - Check bot status

**Automatic Features:**
⏰ Hourly job scanning and notifications
🌙 Daily summary at 9 PM UTC

**How it works:**
1. Scans your Gmail for job alerts
2. Uses AI to identify and score job relevance
3. Sends you only the most relevant opportunities
4. Archives processed emails to keep your inbox clean`);
      }
    });

    this.bot.onText(/\/status/, async (msg) => {
      if (msg.chat.id.toString() === this.chatId) {
        // This will be set by the job processor
        if (this.statusCallback) {
          await this.statusCallback();
        } else {
          this.sendStatusMessage(`✅ Active - Scans 6am-8pm Manila, Summary 9pm`);
        }
      }
    });
  }

  setStatusCallback(callback: () => Promise<void>): void {
    this.statusCallback = callback;
  }

  setJobProcessor(processor: any): void {
    // Handle manual processing command
    this.bot.onText(/\/process/, async (msg) => {
      if (msg.chat.id.toString() === this.chatId) {
        try {
          await this.sendStatusMessage('🚀 Processing jobs...');
          await processor.processJobAlerts();
        } catch (error) {
          await this.sendErrorMessage(
            `Manual processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    });

    // Handle manual daily summary command
    this.bot.onText(/\/summary/, async (msg) => {
      if (msg.chat.id.toString() === this.chatId) {
        try {
          await this.sendStatusMessage('📊 Generating summary...');
          await processor.sendDailySummary();
        } catch (error) {
          await this.sendErrorMessage(
            `Daily summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    });
  }

  async sendJobNotifications(jobs: JobListing[], isHourlyBatch: boolean = true): Promise<void> {
    if (jobs.length === 0) {
      if (isHourlyBatch) {
        await this.sendStatusMessage(
          `📊 **Hourly Batch Complete**\n\nNo relevant jobs found in this batch.\n\n${this.getNextScanMessage()}`
        );
      }
      console.log('No relevant jobs to send');
      return;
    }

    try {
      // Send compact consolidated list with batch indicator
      const compactList = this.formatCompactJobList(jobs, isHourlyBatch);

      // Split into chunks if too long (Telegram has a message limit)
      const chunks = this.splitMessage(compactList, 4000);

      for (let i = 0; i < chunks.length; i++) {
        const header = i === 0 ? '' : `📋 **Job List (Part ${i + 1})**\n\n`;
        await this.bot.sendMessage(this.chatId, header + chunks[i], {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        });

        if (i < chunks.length - 1) {
          await this.delay(1000); // Longer delay between chunks
        }
      }

      console.log(`Sent ${jobs.length} job notifications to Telegram`);
    } catch (error) {
      console.error('Failed to send Telegram notifications:', error);
      throw error;
    }
  }

  async sendDailySummary(
    jobs: JobListing[],
    stats: {
      totalJobsProcessed: number;
      relevantJobs: number;
      emailsProcessed: number;
      topSources: Array<{ source: string; count: number }>;
    }
  ): Promise<void> {
    try {
      const currentDate = new Date().toLocaleDateString();

      let summaryMessage = `🌙 **Daily Job Digest Summary - ${currentDate}**

📊 **Daily Statistics:**
✅ Total Jobs Processed: **${stats.totalJobsProcessed}**
🎯 Relevant Jobs Found: **${stats.relevantJobs}**
📧 Emails Processed: **${stats.emailsProcessed}**

📈 **Top Job Sources:**
${stats.topSources.map((source) => `• ${source.source}: **${source.count}** jobs`).join('\n')}

---

`;

      // Filter jobs with valid apply URLs
      const jobsWithUrls = jobs.filter(
        (job) => job.applyUrl && job.applyUrl.trim() !== '' && job.applyUrl !== 'Unknown URL'
      );

      if (jobsWithUrls.length === 0) {
        summaryMessage +=
          '📝 No relevant opportunities found today.\n\n✨ Tomorrow is another day for new opportunities!';
      } else {
        summaryMessage += `🎯 **${jobsWithUrls.length} Relevant Opportunities Today:**\n\n`;

        // Separate remote and on-site jobs
        const remoteJobs = jobsWithUrls.filter((job) => job.isRemote);
        const onSiteJobs = jobsWithUrls.filter((job) => !job.isRemote);

        // Sort each group by relevance score (highest first)
        const sortedRemoteJobs = remoteJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);
        const sortedOnSiteJobs = onSiteJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Display remote jobs first
        if (sortedRemoteJobs.length > 0) {
          summaryMessage += `🏠 **Remote Opportunities (${sortedRemoteJobs.length}):**\n\n`;

          sortedRemoteJobs.forEach((job) => {
            const relevanceEmoji = this.getRelevanceEmoji(job.relevanceScore);
            const scorePercentage = Math.round(job.relevanceScore * 100);

            summaryMessage += `${relevanceEmoji} **${job.title}**\n`;
            summaryMessage += `🏢 ${job.company} | 📊 ${scorePercentage}%\n`;

            const urlWarning = this.getUrlWarning(job.applyUrl);
            summaryMessage += `🔗 [Apply](${job.applyUrl})${urlWarning}\n\n`;
          });
        }

        // Display on-site jobs second
        if (sortedOnSiteJobs.length > 0) {
          summaryMessage += `🏢 **On-Site Opportunities (${sortedOnSiteJobs.length}):**\n\n`;

          sortedOnSiteJobs.forEach((job) => {
            const relevanceEmoji = this.getRelevanceEmoji(job.relevanceScore);
            const scorePercentage = Math.round(job.relevanceScore * 100);

            summaryMessage += `${relevanceEmoji} **${job.title}**\n`;
            summaryMessage += `🏢 ${job.company} | 📊 ${scorePercentage}%\n`;

            const urlWarning = this.getUrlWarning(job.applyUrl);
            summaryMessage += `🔗 [Apply](${job.applyUrl})${urlWarning}\n\n`;
          });
        }
      }

      summaryMessage += '\n🌅 See you tomorrow for more opportunities!';

      // Split and send the daily summary
      const chunks = this.splitMessage(summaryMessage, 4000);

      for (let i = 0; i < chunks.length; i++) {
        const header = i === 0 ? '' : `🌙 **Daily Summary (Part ${i + 1})**\n\n`;
        await this.bot.sendMessage(this.chatId, header + chunks[i], {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        });

        if (i < chunks.length - 1) {
          await this.delay(1000);
        }
      }

      console.log(`Sent daily summary with ${jobs.length} jobs to Telegram`);
    } catch (error) {
      console.error('Failed to send daily summary:', error);
      throw error;
    }
  }

  private formatCompactJobList(jobs: JobListing[], isHourlyBatch: boolean = true): string {
    // Filter jobs with valid apply URLs first
    const jobsWithUrls = jobs.filter(
      (job) => job.applyUrl && job.applyUrl.trim() !== '' && job.applyUrl !== 'Unknown URL'
    );

    const highRelevanceJobs = jobsWithUrls.filter((job) => job.relevanceScore >= 0.8);
    const mediumRelevanceJobs = jobsWithUrls.filter(
      (job) => job.relevanceScore >= 0.6 && job.relevanceScore < 0.8
    );
    const remoteJobs = jobsWithUrls.filter((job) => job.isRemote);

    const reportType = isHourlyBatch ? '⏰ **Hourly Batch Report**' : '🎯 **Job Opportunities**';

    let message = `${reportType} - ${jobsWithUrls.length} Jobs

📊 **Summary:**
⭐ High Relevance (≥80%): **${highRelevanceJobs.length}**
📈 Medium Relevance (60-79%): **${mediumRelevanceJobs.length}**
🏠 Remote: **${remoteJobs.length}** | 🏢 On-site: **${jobsWithUrls.length - remoteJobs.length}**

📅 ${new Date().toLocaleString()}

---

`;

    // Sort by relevance score (highest first)
    const sortedJobs = jobsWithUrls.sort((a, b) => b.relevanceScore - a.relevanceScore);

    sortedJobs.forEach((job) => {
      const relevanceEmoji = this.getRelevanceEmoji(job.relevanceScore);
      const remoteEmoji = job.isRemote ? '🏠' : '🏢';
      const scorePercentage = Math.round(job.relevanceScore * 100);

      message += `${relevanceEmoji} **${job.title}**\n`;
      message += `🏢 ${job.company} ${remoteEmoji} | 📊 ${scorePercentage}%\n`;

      // Add URL warning if it looks like it might be wrong
      const urlWarning = this.getUrlWarning(job.applyUrl);
      message += `🔗 [Apply](${job.applyUrl})${urlWarning}\n\n`;
    });

    return message;
  }

  private splitMessage(message: string, maxLength: number): string[] {
    if (message.length <= maxLength) return [message];

    const chunks: string[] = [];
    let currentChunk = '';
    const lines = message.split('\n');

    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
      currentChunk += line + '\n';
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private getRelevanceEmoji(score: number): string {
    if (score >= 0.9) return '🎯';
    if (score >= 0.8) return '⭐';
    if (score >= 0.7) return '🔥';
    if (score >= 0.6) return '✅';
    if (score >= 0.5) return '📋';
    return '📄';
  }

  private getUrlWarning(url: string): string {
    if (!url) return ' ⚠️ _No URL_';

    // Check for potentially problematic LinkedIn URLs
    if (url.includes('linkedin.com/company/') && !url.includes('/jobs/')) {
      return ' ⚠️ _Company page - may not be direct job link_';
    }

    // Check for other suspicious patterns
    if (url.includes('/company') && !url.includes('job')) {
      return ' ⚠️ _May be company page_';
    }

    return ''; // No warning needed
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

  private async sendMessage(message: string): Promise<void> {
    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  async sendStatusMessage(message: string): Promise<void> {
    try {
      await this.bot.sendMessage(this.chatId, `🤖 *Job Bot Status*\n\n${message}`, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Failed to send status message:', error);
    }
  }

  async sendErrorMessage(error: string): Promise<void> {
    try {
      const message = `
❌ *Job Bot Error*

${error}

🕐 Time: ${new Date().toLocaleString()}
      `.trim();

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Failed to send error message:', err);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.bot.sendMessage(this.chatId, '🔧 Testing Telegram connection...', {
        parse_mode: 'Markdown',
      });
      return true;
    } catch (error) {
      console.error('Telegram connection test failed:', error);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
