import TelegramBot from 'node-telegram-bot-api';
import { JobListing } from '../models/types';

export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
    this.chatId = process.env.TELEGRAM_CHAT_ID!;
  }

  async sendJobNotifications(jobs: JobListing[]): Promise<void> {
    if (jobs.length === 0) {
      console.log('No relevant jobs to send');
      return;
    }

    try {
      // Send compact consolidated list
      const compactList = this.formatCompactJobList(jobs);
      
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

  private formatCompactJobList(jobs: JobListing[]): string {
    const highRelevanceJobs = jobs.filter(job => job.relevanceScore >= 0.8);
    const mediumRelevanceJobs = jobs.filter(job => job.relevanceScore >= 0.6 && job.relevanceScore < 0.8);
    const remoteJobs = jobs.filter(job => job.isRemote);
    
    let message = `🎯 **Job Digest - ${jobs.length} Opportunities**

📊 **Summary:**
⭐ High Relevance (≥80%): **${highRelevanceJobs.length}**
📈 Medium Relevance (60-79%): **${mediumRelevanceJobs.length}**
🏠 Remote: **${remoteJobs.length}** | 🏢 On-site: **${jobs.length - remoteJobs.length}**

📅 Generated: ${new Date().toLocaleString()}

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

  private formatSummaryMessage(jobs: JobListing[]): string {
    const highRelevanceJobs = jobs.filter(job => job.relevanceScore >= 0.8).length;
    const mediumRelevanceJobs = jobs.filter(job => job.relevanceScore >= 0.6 && job.relevanceScore < 0.8).length;
    const remoteJobs = jobs.filter(job => job.isRemote).length;
    
    return `
🔔 *Job Digest Summary*

📊 Total Jobs Found: *${jobs.length}*
⭐ High Relevance (≥80%): *${highRelevanceJobs}*
📈 Medium Relevance (60-79%): *${mediumRelevanceJobs}*
🏠 Remote Positions: *${remoteJobs}*

📅 Generated: ${new Date().toLocaleString()}

---
Individual job details below ⬇️
    `.trim();
  }

  private formatJobMessage(job: JobListing): string {
    const relevanceEmoji = this.getRelevanceEmoji(job.relevanceScore);
    const remoteEmoji = job.isRemote ? '🏠' : '🏢';
    const scorePercentage = Math.round(job.relevanceScore * 100);
    
    return `
${relevanceEmoji} *${job.title}*

🏢 Company: *${job.company}*
📍 Location: ${job.location} ${remoteEmoji}
📊 Relevance: *${scorePercentage}%*
🔗 Source: ${job.source}
💰 Salary: ${job.salary || 'Not specified'}

📝 *Requirements:*
${job.requirements.slice(0, 5).map(req => `• ${req}`).join('\n') || 'Not specified'}

🔗 [Apply Here](${job.applyUrl})

---
    `.trim();
  }

  private getRelevanceEmoji(score: number): string {
    if (score >= 0.9) return '🎯';
    if (score >= 0.8) return '⭐';
    if (score >= 0.7) return '🔥';
    if (score >= 0.6) return '✅';
    if (score >= 0.5) return '📋';
    return '📄';
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