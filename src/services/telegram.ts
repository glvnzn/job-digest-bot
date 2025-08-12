import TelegramBot from 'node-telegram-bot-api';
import { JobListing } from '../models/types';

export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

  constructor() {
    // Enable polling only in development for commands
    const enablePolling = process.env.NODE_ENV !== 'production';
    console.log(`🤖 Telegram bot starting with polling: ${enablePolling}`);
    
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: enablePolling });
    this.chatId = process.env.TELEGRAM_CHAT_ID!;
    
    if (enablePolling) {
      console.log('📱 Setting up Telegram commands...');
      this.setupCommands();
      
      // Add error handling for polling
      this.bot.on('polling_error', (error) => {
        console.error('🚨 Telegram polling error:', error);
      });
    }
  }

  private setupCommands(): void {
    // Set bot commands for better UX
    this.bot.setMyCommands([
      { command: 'start', description: 'Start the job digest bot' },
      { command: 'process', description: 'Manually trigger job processing' },
      { command: 'summary', description: 'Get today\'s summary' },
      { command: 'status', description: 'Check bot status' },
      { command: 'help', description: 'Show available commands' }
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

    this.bot.onText(/\/status/, (msg) => {
      if (msg.chat.id.toString() === this.chatId) {
        this.sendStatusMessage(`**Bot Status: Active** ✅

⏰ **Next scheduled scan:** Top of next hour
🌙 **Daily summary:** 9:00 PM UTC
🤖 **AI Processing:** OpenAI GPT-4o-mini
📧 **Email Processing:** Gmail API connected
🔗 **Database:** PostgreSQL connected

All systems operational!`);
      }
    });
  }

  setJobProcessor(processor: any): void {
    // Handle manual processing command
    this.bot.onText(/\/process/, async (msg) => {
      if (msg.chat.id.toString() === this.chatId) {
        try {
          await this.sendStatusMessage('🚀 **Manual Processing Started**\n\nProcessing job alerts now...');
          await processor.processJobAlerts();
        } catch (error) {
          await this.sendErrorMessage(`Manual processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });

    // Handle manual daily summary command
    this.bot.onText(/\/summary/, async (msg) => {
      if (msg.chat.id.toString() === this.chatId) {
        try {
          await this.sendStatusMessage('📊 **Generating Daily Summary**\n\nCollecting today\'s job data...');
          await processor.sendDailySummary();
        } catch (error) {
          await this.sendErrorMessage(`Daily summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });
  }

  async sendJobNotifications(jobs: JobListing[], isHourlyBatch: boolean = true): Promise<void> {
    if (jobs.length === 0) {
      if (isHourlyBatch) {
        await this.sendStatusMessage('📊 **Hourly Batch Complete**\n\nNo relevant jobs found in this batch.\n\n⏰ Next scan in 1 hour');
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
          disable_web_page_preview: true 
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

  async sendDailySummary(jobs: JobListing[], stats: {
    totalJobsProcessed: number;
    relevantJobs: number;
    emailsProcessed: number;
    topSources: Array<{source: string, count: number}>;
  }): Promise<void> {
    try {
      const currentDate = new Date().toLocaleDateString();
      
      let summaryMessage = `🌙 **Daily Job Digest Summary - ${currentDate}**

📊 **Daily Statistics:**
✅ Total Jobs Processed: **${stats.totalJobsProcessed}**
🎯 Relevant Jobs Found: **${stats.relevantJobs}**
📧 Emails Processed: **${stats.emailsProcessed}**

📈 **Top Job Sources:**
${stats.topSources.map(source => `• ${source.source}: **${source.count}** jobs`).join('\n')}

---

`;

      if (jobs.length === 0) {
        summaryMessage += '📝 No relevant opportunities found today.\n\n✨ Tomorrow is another day for new opportunities!';
      } else {
        summaryMessage += `🎯 **${jobs.length} Relevant Opportunities Today:**\n\n`;
        
        // Sort by relevance score (highest first)
        const sortedJobs = jobs.sort((a, b) => b.relevanceScore - a.relevanceScore);

        sortedJobs.forEach((job) => {
          const relevanceEmoji = this.getRelevanceEmoji(job.relevanceScore);
          const remoteEmoji = job.isRemote ? '🏠' : '🏢';
          const scorePercentage = Math.round(job.relevanceScore * 100);
          
          summaryMessage += `${relevanceEmoji} **${job.title}**\n`;
          summaryMessage += `🏢 ${job.company} ${remoteEmoji} | 📊 ${scorePercentage}%\n`;
          summaryMessage += `🔗 [Apply](${job.applyUrl})\n\n`;
        });
      }

      summaryMessage += '\n🌅 See you tomorrow for more opportunities!';

      // Split and send the daily summary
      const chunks = this.splitMessage(summaryMessage, 4000);
      
      for (let i = 0; i < chunks.length; i++) {
        const header = i === 0 ? '' : `🌙 **Daily Summary (Part ${i + 1})**\n\n`;
        await this.bot.sendMessage(this.chatId, header + chunks[i], { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true 
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
    const highRelevanceJobs = jobs.filter(job => job.relevanceScore >= 0.8);
    const mediumRelevanceJobs = jobs.filter(job => job.relevanceScore >= 0.6 && job.relevanceScore < 0.8);
    const remoteJobs = jobs.filter(job => job.isRemote);
    
    const reportType = isHourlyBatch ? '⏰ **Hourly Batch Report**' : '🎯 **Job Opportunities**';
    
    let message = `${reportType} - ${jobs.length} Jobs

📊 **Summary:**
⭐ High Relevance (≥80%): **${highRelevanceJobs.length}**
📈 Medium Relevance (60-79%): **${mediumRelevanceJobs.length}**
🏠 Remote: **${remoteJobs.length}** | 🏢 On-site: **${jobs.length - remoteJobs.length}**

📅 ${new Date().toLocaleString()}

---

`;

    // Sort by relevance score (highest first)
    const sortedJobs = jobs.sort((a, b) => b.relevanceScore - a.relevanceScore);

    sortedJobs.forEach((job) => {
      const relevanceEmoji = this.getRelevanceEmoji(job.relevanceScore);
      const remoteEmoji = job.isRemote ? '🏠' : '🏢';
      const scorePercentage = Math.round(job.relevanceScore * 100);
      
      message += `${relevanceEmoji} **${job.title}**\n`;
      message += `🏢 ${job.company} ${remoteEmoji} | 📊 ${scorePercentage}%\n`;
      message += `🔗 [Apply](${job.applyUrl})\n\n`;
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

  private async sendMessage(message: string): Promise<void> {
    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  async sendStatusMessage(message: string): Promise<void> {
    try {
      await this.bot.sendMessage(this.chatId, `🤖 *Job Bot Status*\n\n${message}`, {
        parse_mode: 'Markdown'
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
        parse_mode: 'Markdown'
      });
    } catch (err) {
      console.error('Failed to send error message:', err);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.bot.sendMessage(this.chatId, '🔧 Testing Telegram connection...', {
        parse_mode: 'Markdown'
      });
      return true;
    } catch (error) {
      console.error('Telegram connection test failed:', error);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}