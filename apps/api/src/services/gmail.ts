import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface EmailData {
  id: string;
  subject: string;
  from: string;
  body: string;
  date: Date;
}

export interface TokenInfo {
  isValid: boolean;
  expiresAt?: Date;
  needsRefresh: boolean;
  refreshTokenExpired?: boolean;
  error?: string;
  lastNotified?: Date;
}

export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private lastTokenCheck: Date | null = null;
  private tokenCheckInterval = 5 * 60 * 1000; // 5 minutes
  private lastRefreshTokenErrorNotification: Date | null = null;
  private notificationCooldown = 60 * 60 * 1000; // 1 hour cooldown between notifications

  constructor(private telegramService?: any) {
    this.oauth2Client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Send notification about refresh token expiration
   */
  private async notifyRefreshTokenExpiration(error: string): Promise<void> {
    const now = new Date();
    
    // Check cooldown to avoid spam
    if (this.lastRefreshTokenErrorNotification && 
        (now.getTime() - this.lastRefreshTokenErrorNotification.getTime()) < this.notificationCooldown) {
      return;
    }
    
    this.lastRefreshTokenErrorNotification = now;
    
    const message = `🚨 **Gmail Refresh Token Expired**

❌ **Error:** ${error}

🔧 **Action Required:**
Run this command to generate a new refresh token:
\`\`\`
npm run generate-gmail-token
\`\`\`

⏰ **When:** ASAP - Email processing is currently stopped
📍 **Where:** Run from the job-digest-bot project directory
🔄 **Then:** Update your .env file with the new GMAIL_REFRESH_TOKEN

💡 **Note:** This typically happens when:
- Token was revoked in Google Account settings
- Long period of inactivity 
- Google security policy changes

Last notification: ${now.toISOString()}`;

    // Log to console first
    console.error('🚨 GMAIL REFRESH TOKEN EXPIRED - Manual action required!');
    console.error(`Error: ${error}`);
    console.error('Run: npm run generate-gmail-token');
    
    // Send Telegram notification if service is available
    if (this.telegramService) {
      try {
        await this.telegramService.sendMessage(message);
        console.log('✅ Sent refresh token expiration notification via Telegram');
      } catch (telegramError) {
        console.error('❌ Failed to send Telegram notification:', telegramError);
      }
    } else {
      console.warn('⚠️ No Telegram service available for notifications');
    }
  }

  /**
   * Check token status and refresh if needed
   */
  async checkAndRefreshToken(): Promise<TokenInfo> {
    try {
      const now = new Date();
      
      // Check if we need to validate the token
      if (!this.lastTokenCheck || (now.getTime() - this.lastTokenCheck.getTime()) > this.tokenCheckInterval) {
        this.lastTokenCheck = now;
        
        // Get current token info
        const tokenInfo = await this.oauth2Client.getAccessToken();
        
        if (!tokenInfo.token) {
          console.warn('🔄 Access token missing, attempting refresh...');
          const refreshResult = await this.oauth2Client.refreshAccessToken();
          
          if (refreshResult.credentials.access_token) {
            console.log('✅ Token refreshed successfully');
            return {
              isValid: true,
              expiresAt: refreshResult.credentials.expiry_date ? new Date(refreshResult.credentials.expiry_date) : undefined,
              needsRefresh: false
            };
          } else {
            console.error('❌ Token refresh failed - no access token returned');
            return {
              isValid: false,
              needsRefresh: true,
              error: 'Failed to refresh access token'
            };
          }
        }
        
        // Check if token is expiring soon (within 5 minutes)
        const expiryDate = this.oauth2Client.credentials.expiry_date ? new Date(this.oauth2Client.credentials.expiry_date) : null;
        const needsRefresh = expiryDate ? (expiryDate.getTime() - now.getTime()) < 5 * 60 * 1000 : false;
        
        if (needsRefresh) {
          console.log('🔄 Token expiring soon, refreshing preemptively...');
          try {
            const refreshResult = await this.oauth2Client.refreshAccessToken();
            console.log('✅ Token refreshed preemptively');
            return {
              isValid: true,
              expiresAt: refreshResult.credentials.expiry_date ? new Date(refreshResult.credentials.expiry_date) : undefined,
              needsRefresh: false
            };
          } catch (refreshError) {
            console.error('❌ Preemptive token refresh failed:', refreshError);
            const errorMessage = refreshError instanceof Error ? refreshError.message : 'Unknown error';
            const isRefreshTokenExpired = errorMessage.includes('invalid_grant') || 
                                        errorMessage.includes('refresh token') ||
                                        errorMessage.includes('revoked');
            
            if (isRefreshTokenExpired) {
              await this.notifyRefreshTokenExpiration(errorMessage);
            }
            
            return {
              isValid: false,
              needsRefresh: true,
              refreshTokenExpired: isRefreshTokenExpired,
              error: `Refresh failed: ${errorMessage}`
            };
          }
        }
        
        return {
          isValid: true,
          expiresAt: expiryDate || undefined,
          needsRefresh: false
        };
      }
      
      // Return cached status if we checked recently
      return {
        isValid: true,
        needsRefresh: false
      };
    } catch (error) {
      console.error('❌ Token check failed:', error);
      
      // Try to determine if this is a token-related error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTokenError = errorMessage.includes('invalid_grant') || 
                          errorMessage.includes('invalid_token') ||
                          errorMessage.includes('unauthorized');
                          
      const isRefreshTokenExpired = errorMessage.includes('invalid_grant') || 
                                  errorMessage.includes('refresh token') ||
                                  errorMessage.includes('revoked');
      
      if (isRefreshTokenExpired) {
        await this.notifyRefreshTokenExpiration(errorMessage);
      }
      
      return {
        isValid: false,
        needsRefresh: isTokenError,
        refreshTokenExpired: isRefreshTokenExpired,
        error: errorMessage
      };
    }
  }

  /**
   * Execute Gmail API calls with automatic token refresh
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      // Check token status first
      const tokenInfo = await this.checkAndRefreshToken();
      
      if (!tokenInfo.isValid && tokenInfo.needsRefresh) {
        throw new Error(`Gmail token invalid: ${tokenInfo.error || 'Unknown token error'}`);
      }
      
      // Execute the operation
      return await operation();
    } catch (error) {
      console.error('Gmail API operation failed:', error);
      
      // Check if this is an auth error and try to refresh once more
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isAuthError = errorMessage.includes('invalid_grant') || 
                         errorMessage.includes('invalid_token') ||
                         errorMessage.includes('unauthorized') ||
                         errorMessage.includes('401');
      
      if (isAuthError) {
        console.log('🔄 Auth error detected, attempting token refresh...');
        try {
          await this.oauth2Client.refreshAccessToken();
          console.log('✅ Token refreshed after auth error, retrying operation...');
          
          // Retry the operation once
          return await operation();
        } catch (refreshError) {
          console.error('❌ Token refresh after auth error failed:', refreshError);
          const refreshErrorMessage = refreshError instanceof Error ? refreshError.message : 'Unknown error';
          const isRefreshTokenExpired = refreshErrorMessage.includes('invalid_grant') || 
                                      refreshErrorMessage.includes('refresh token') ||
                                      refreshErrorMessage.includes('revoked');
          
          if (isRefreshTokenExpired) {
            await this.notifyRefreshTokenExpiration(refreshErrorMessage);
          }
          
          throw new Error(`🚨 Gmail refresh token expired! Run: npm run generate-gmail-token\n\nError: ${refreshErrorMessage}`);
        }
      }
      
      // Re-throw non-auth errors
      throw error;
    }
  }

  async getRecentEmails(): Promise<EmailData[]> {
    return this.executeWithRetry(async () => {
      // Get unread emails from recent days - let AI decide what's job-related
      const query = 'is:unread newer_than:3d';

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100, // Increased limit since we're casting a wider net
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

        const batchPromises = batch.map(async (message: { id: string }) => {
          try {
            const email = await this.getEmailDetails(message.id);
            return email;
          } catch (error) {
            console.error(`Failed to fetch email ${message.id}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        emails.push(...(batchResults.filter(email => email !== null) as EmailData[]));

        // Small delay between batches to respect rate limits
        if (i + batchSize < response.data.messages.length) {
          await this.delay(200);
        }
      }

      return emails;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getEmailDetails(messageId: string): Promise<EmailData | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload.headers;

      const subjectHeader = headers.find((h: any) => h.name === 'Subject'); // eslint-disable-line @typescript-eslint/no-explicit-any
      const fromHeader = headers.find((h: any) => h.name === 'From'); // eslint-disable-line @typescript-eslint/no-explicit-any
      const dateHeader = headers.find((h: any) => h.name === 'Date'); // eslint-disable-line @typescript-eslint/no-explicit-any

      const body = this.extractEmailBody(message.payload);

      return {
        id: messageId,
        subject: subjectHeader?.value || '',
        from: fromHeader?.value || '',
        body: body || '',
        date: dateHeader ? new Date(dateHeader.value) : new Date(),
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
    return this.executeWithRetry(async () => {
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId,
      });
      console.log(`Email ${messageId} deleted successfully`);
    });
  }

  async markAsRead(messageId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['UNREAD'],
        },
      });
      console.log(`Email ${messageId} marked as read successfully`);
    });
  }

  async archiveEmail(messageId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['INBOX'],
        },
      });
      console.log(`Email ${messageId} archived successfully`);
    });
  }

  async markAsReadAndArchive(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['UNREAD', 'INBOX'],
        },
      });
      console.log(`Email ${messageId} marked as read and archived successfully`);
    } catch (error) {
      console.error(`Failed to mark email ${messageId} as read and archive:`, error);
      throw error;
    }
  }

  async applyLabel(messageId: string, labelId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          addLabelIds: [labelId],
        },
      });
      console.log(`Label ${labelId} applied to email ${messageId} successfully`);
    } catch (error) {
      console.error(`Failed to apply label ${labelId} to email ${messageId}:`, error);
      throw error;
    }
  }

  async removeLabel(messageId: string, labelId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: [labelId],
        },
      });
      console.log(`Label ${labelId} removed from email ${messageId} successfully`);
    } catch (error) {
      console.error(`Failed to remove label ${labelId} from email ${messageId}:`, error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      return await this.executeWithRetry(async () => {
        const response = await this.gmail.users.getProfile({
          userId: 'me',
        });
        console.log(`Gmail connection successful for: ${response.data.emailAddress}`);
        return true;
      });
    } catch (error) {
      console.error('Gmail connection failed:', error);
      return false;
    }
  }

  /**
   * Get current token status and expiration info
   */
  async getTokenStatus(): Promise<TokenInfo> {
    return this.checkAndRefreshToken();
  }

  /**
   * Test refresh token expiration detection and notifications
   * This method simulates various token expiration scenarios
   */
  async testTokenExpirationNotifications(): Promise<void> {
    console.log('🧪 Testing Gmail refresh token expiration detection...\n');

    const testScenarios = [
      {
        name: 'Invalid Grant Error',
        error: 'invalid_grant: Token has been expired or revoked',
        shouldNotify: true
      },
      {
        name: 'Refresh Token Revoked',
        error: 'refresh token has been revoked',
        shouldNotify: true
      },
      {
        name: 'Token Revoked by User',
        error: 'Token has been revoked',
        shouldNotify: true
      },
      {
        name: 'Regular API Error',
        error: 'Request had insufficient authentication scopes',
        shouldNotify: false
      },
      {
        name: 'Network Error',
        error: 'ECONNREFUSED: Connection refused',
        shouldNotify: false
      }
    ];

    for (const scenario of testScenarios) {
      console.log(`\n📋 Testing: ${scenario.name}`);
      console.log(`   Error: ${scenario.error}`);
      console.log(`   Should notify: ${scenario.shouldNotify}`);
      
      try {
        // Check if this error would trigger notification
        const errorMessage = scenario.error;
        const isRefreshTokenExpired = errorMessage.includes('invalid_grant') || 
                                    errorMessage.includes('refresh token') ||
                                    errorMessage.includes('revoked');
        
        console.log(`   Detection result: ${isRefreshTokenExpired ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
        
        if (scenario.shouldNotify && !isRefreshTokenExpired) {
          console.log(`   ⚠️  WARNING: Should have detected but didn't!`);
        } else if (!scenario.shouldNotify && isRefreshTokenExpired) {
          console.log(`   ⚠️  WARNING: Detected but shouldn't have!`);
        } else {
          console.log(`   ✅ Correct detection`);
        }

        // Test actual notification (but don't send to avoid spam)
        if (isRefreshTokenExpired) {
          console.log(`   📤 Would send notification: "${scenario.error}"`);
          // Uncomment next line to actually test notifications:
          // await this.notifyRefreshTokenExpiration(scenario.error);
        }

      } catch (error) {
        console.error(`   ❌ Test failed:`, error);
      }
    }

    console.log('\n🧪 Test completed!\n');
    
    // Test cooldown mechanism
    console.log('🕒 Testing notification cooldown...');
    const now = new Date();
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Last notification: ${this.lastRefreshTokenErrorNotification?.toISOString() || 'Never'}`);
    
    const timeSinceLastNotification = this.lastRefreshTokenErrorNotification ? 
      now.getTime() - this.lastRefreshTokenErrorNotification.getTime() : null;
    
    if (timeSinceLastNotification) {
      console.log(`   Time since last: ${Math.round(timeSinceLastNotification / 1000)} seconds`);
      console.log(`   Cooldown active: ${timeSinceLastNotification < this.notificationCooldown ? '✅ YES' : '❌ NO'}`);
    }
  }

  // Expose Gmail API objects for advanced operations (used by EmailOrganizerService)
  get users() {
    return this.gmail.users;
  }
}
