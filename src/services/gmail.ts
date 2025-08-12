import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface EmailData {
  id: string;
  subject: string;
  from: string;
  body: string;
  date: Date;
}

export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail: any;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async getRecentEmails(): Promise<EmailData[]> {
    try {
      // Get unread emails from recent days - let AI decide what's job-related
      const query = 'is:unread newer_than:3d';
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100 // Increased limit since we're casting a wider net
      });

      if (!response.data.messages) {
        console.log('No recent emails found');
        return [];
      }

      const emails: EmailData[] = [];
      
      // Process emails in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < response.data.messages.length; i += batchSize) {
        const batch = response.data.messages.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (message: any) => {
          try {
            const email = await this.getEmailDetails(message.id);
            return email;
          } catch (error) {
            console.error(`Failed to fetch email ${message.id}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        emails.push(...batchResults.filter(email => email !== null) as EmailData[]);
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < response.data.messages.length) {
          await this.delay(200);
        }
      }

      return emails;
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getEmailDetails(messageId: string): Promise<EmailData | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;
      
      const subjectHeader = headers.find((h: any) => h.name === 'Subject');
      const fromHeader = headers.find((h: any) => h.name === 'From');
      const dateHeader = headers.find((h: any) => h.name === 'Date');

      const body = this.extractEmailBody(message.payload);

      return {
        id: messageId,
        subject: subjectHeader?.value || '',
        from: fromHeader?.value || '',
        body: body || '',
        date: dateHeader ? new Date(dateHeader.value) : new Date()
      };
    } catch (error) {
      console.error(`Error fetching email details for ${messageId}:`, error);
      return null;
    }
  }

  private extractEmailBody(payload: any): string {
    let body = '';

    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
          if (part.body && part.body.data) {
            const partBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
            body += partBody;
          }
        } else if (part.parts) {
          body += this.extractEmailBody(part);
        }
      }
    }

    return this.cleanHtmlContent(body);
  }

  private cleanHtmlContent(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  async deleteEmail(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId
      });
      console.log(`Email ${messageId} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete email ${messageId}:`, error);
      throw error;
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['UNREAD']
        }
      });
    } catch (error) {
      console.error(`Failed to mark email ${messageId} as read:`, error);
    }
  }

  async archiveEmail(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['INBOX']
        }
      });
      console.log(`Email ${messageId} archived successfully`);
    } catch (error) {
      console.error(`Failed to archive email ${messageId}:`, error);
      throw error;
    }
  }

  async markAsReadAndArchive(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['UNREAD', 'INBOX']
        }
      });
      console.log(`Email ${messageId} marked as read and archived successfully`);
    } catch (error) {
      console.error(`Failed to mark email ${messageId} as read and archive:`, error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });
      console.log(`Gmail connection successful for: ${response.data.emailAddress}`);
      return true;
    } catch (error) {
      console.error('Gmail connection failed:', error);
      return false;
    }
  }
}