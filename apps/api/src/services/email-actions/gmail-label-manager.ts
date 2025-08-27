import { GmailService } from '../gmail';
import { EmailCategory } from '../email-classification/types';
import { LABEL_COLORS, ACTION_CONFIG } from './action-config';

/**
 * Manages Gmail labels for email organization
 * Handles label creation, caching, and error recovery
 */
export class GmailLabelManager {
  private gmail: GmailService;
  private labelCache = new Map<string, string>(); // labelName -> labelId
  private creationAttempts = new Map<string, number>(); // Track failed creation attempts

  constructor(gmailService: GmailService) {
    this.gmail = gmailService;
    console.log('🏷️ GmailLabelManager initialized');
  }

  /**
   * Get or create a Gmail label with caching
   */
  async getOrCreateLabel(labelName: string, category?: EmailCategory): Promise<string> {
    // Check cache first
    if (this.labelCache.has(labelName)) {
      return this.labelCache.get(labelName)!;
    }

    // Check if we've failed to create this label too many times
    const attempts = this.creationAttempts.get(labelName) || 0;
    if (attempts >= 3) {
      console.warn(`⚠️ Skipping label creation for "${labelName}" after ${attempts} failed attempts`);
      throw new Error(`Label creation failed after ${attempts} attempts`);
    }

    try {
      const labelId = await this.createOrFindLabel(labelName, category);
      this.labelCache.set(labelName, labelId);
      
      // Reset failure count on success
      this.creationAttempts.delete(labelName);
      
      return labelId;
      
    } catch (error) {
      // Track failed attempts
      this.creationAttempts.set(labelName, attempts + 1);
      console.error(`Failed to get/create label "${labelName}":`, error);
      throw error;
    }
  }

  /**
   * Apply a label to an email
   */
  async applyLabel(messageId: string, labelName: string, category?: EmailCategory): Promise<boolean> {
    try {
      if (ACTION_CONFIG.DRY_RUN_MODE) {
        console.log(`🔄 [DRY RUN] Would apply label "${labelName}" to email ${messageId}`);
        return true;
      }

      if (!ACTION_CONFIG.CREATE_GMAIL_LABELS) {
        if (ACTION_CONFIG.LOG_EMAIL_ACTIONS) {
          console.log(`⏭️ Label creation disabled, skipping "${labelName}" for email ${messageId}`);
        }
        return false;
      }

      const labelId = await this.getOrCreateLabel(labelName, category);
      await this.gmail.applyLabel(messageId, labelId);
      
      if (ACTION_CONFIG.LOG_EMAIL_ACTIONS) {
        console.log(`✅ Applied label "${labelName}" to email ${messageId}`);
      }
      
      return true;
      
    } catch (error) {
      console.error(`Failed to apply label "${labelName}" to email ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Apply multiple labels to an email in batch
   */
  async applyLabels(messageId: string, labelNames: string[], category?: EmailCategory): Promise<number> {
    let successCount = 0;
    
    for (const labelName of labelNames) {
      const success = await this.applyLabel(messageId, labelName, category);
      if (success) successCount++;
      
      // Small delay between label applications
      if (ACTION_CONFIG.ACTION_DELAY_MS > 0) {
        await this.delay(ACTION_CONFIG.ACTION_DELAY_MS / 4);
      }
    }
    
    return successCount;
  }

  /**
   * Remove a label from an email
   */
  async removeLabel(messageId: string, labelName: string): Promise<boolean> {
    try {
      if (ACTION_CONFIG.DRY_RUN_MODE) {
        console.log(`🔄 [DRY RUN] Would remove label "${labelName}" from email ${messageId}`);
        return true;
      }

      const labelId = this.labelCache.get(labelName);
      if (!labelId) {
        console.warn(`Label "${labelName}" not found in cache, cannot remove`);
        return false;
      }

      await this.gmail.removeLabel(messageId, labelId);
      
      if (ACTION_CONFIG.LOG_EMAIL_ACTIONS) {
        console.log(`🗑️ Removed label "${labelName}" from email ${messageId}`);
      }
      
      return true;
      
    } catch (error) {
      console.error(`Failed to remove label "${labelName}" from email ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Get all cached labels
   */
  getCachedLabels(): Map<string, string> {
    return new Map(this.labelCache);
  }

  /**
   * Clear label cache (useful for testing or reset)
   */
  clearCache(): void {
    this.labelCache.clear();
    this.creationAttempts.clear();
    console.log('🧹 Gmail label cache cleared');
  }

  /**
   * Pre-warm cache with commonly used labels
   */
  async preWarmCache(categories: EmailCategory[]): Promise<void> {
    console.log(`🔥 Pre-warming label cache for ${categories.length} categories`);
    
    const promises = categories.map(category => {
      const labelName = `Email/${category.charAt(0).toUpperCase() + category.slice(1)}`;
      return this.getOrCreateLabel(labelName, category).catch(error => {
        console.warn(`Failed to pre-warm label for ${category}:`, error);
        return null;
      });
    });
    
    const results = await Promise.all(promises);
    const successCount = results.filter(result => result !== null).length;
    
    console.log(`✅ Pre-warmed ${successCount}/${categories.length} labels`);
  }

  /**
   * Create or find a Gmail label
   */
  private async createOrFindLabel(labelName: string, category?: EmailCategory): Promise<string> {
    try {
      console.log(`🔍 Searching for/creating label: "${labelName}"`);
      
      // First, try to find existing label
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      });

      if (!response.data.labels) {
        console.warn(`⚠️ No labels found in Gmail API response`);
      } else {
        console.log(`📋 Found ${response.data.labels.length} existing labels in Gmail`);
      }

      const existingLabel = response.data.labels?.find(
        (label: any) => label.name?.toLowerCase() === labelName.toLowerCase()
      );

      if (existingLabel?.id) {
        console.log(`✅ Found existing label: ${labelName} (ID: ${existingLabel.id})`);
        return existingLabel.id;
      }

      // Create new label if not found
      console.log(`🚀 Creating new label: ${labelName}`);
      const labelColor = category ? LABEL_COLORS[category] : undefined;
      
      const createRequest = {
        name: labelName,
        labelListVisibility: 'labelShow' as const,
        messageListVisibility: 'show' as const,
        ...(labelColor && { color: labelColor })
      };
      
      console.log(`📝 Label creation request:`, JSON.stringify(createRequest, null, 2));
      
      const newLabel = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: createRequest,
      });

      if (!newLabel.data.id) {
        throw new Error(`Label creation succeeded but no ID returned`);
      }

      console.log(`✨ Successfully created Gmail label: ${labelName} (ID: ${newLabel.data.id})`);
      return newLabel.data.id;
      
    } catch (error) {
      console.error(`❌ Failed to create/find label "${labelName}":`, error);
      if (error instanceof Error) {
        console.error(`Error details:`, {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3)
        });
      }
      throw error;
    }
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics about label operations
   */
  getStats(): {
    cachedLabels: number;
    failedAttempts: number;
    mostFailedLabel?: string;
  } {
    let mostFailedLabel: string | undefined;
    let maxFailures = 0;
    
    for (const [labelName, attempts] of this.creationAttempts.entries()) {
      if (attempts > maxFailures) {
        maxFailures = attempts;
        mostFailedLabel = labelName;
      }
    }
    
    return {
      cachedLabels: this.labelCache.size,
      failedAttempts: this.creationAttempts.size,
      mostFailedLabel
    };
  }
}