import { GmailService } from '../gmail';
import { EmailData, ClassificationResult } from '../email-classification/types';
import { GmailLabelManager } from './gmail-label-manager';
import { getEmailActions, ACTION_CONFIG } from './action-config';

/**
 * Applies actions to emails based on classification results
 * Coordinates Gmail operations like labeling, reading, and archiving
 */
export class EmailActionApplier {
  private gmail: GmailService;
  private labelManager: GmailLabelManager;
  private stats = {
    emailsProcessed: 0,
    labelsApplied: 0,
    emailsMarkedRead: 0,
    emailsArchived: 0,
    errors: 0
  };

  constructor(gmailService: GmailService) {
    this.gmail = gmailService;
    this.labelManager = new GmailLabelManager(gmailService);
    console.log('⚡ EmailActionApplier initialized');
  }

  /**
   * Apply actions to a single email based on classification
   */
  async applyActions(email: EmailData, classification: ClassificationResult): Promise<boolean> {
    try {
      const actions = getEmailActions(classification.category);
      const startTime = Date.now();
      
      if (ACTION_CONFIG.DRY_RUN_MODE) {
        console.log(`🔄 [DRY RUN] Would apply actions to "${email.subject}": ${JSON.stringify(actions)}`);
        return true;
      }

      if (!ACTION_CONFIG.APPLY_EMAIL_ACTIONS) {
        if (ACTION_CONFIG.LOG_EMAIL_ACTIONS) {
          console.log(`⏭️ Email actions disabled, skipping "${email.subject}"`);
        }
        return false;
      }

      let success = true;
      const appliedActions: string[] = [];

      // 1. Apply Gmail label
      if (actions.label) {
        try {
          const labelSuccess = await this.labelManager.applyLabel(email.id, actions.label, classification.category);
          if (labelSuccess) {
            this.stats.labelsApplied++;
            appliedActions.push(`labeled:${actions.label}`);
          } else {
            success = false;
          }
        } catch (error) {
          console.error(`Failed to apply label to email ${email.id}:`, error);
          success = false;
        }
      }

      // 2. Mark as read (if specified)
      if (actions.markAsRead) {
        try {
          await this.gmail.markAsRead(email.id);
          this.stats.emailsMarkedRead++;
          appliedActions.push('marked-read');
        } catch (error) {
          console.error(`Failed to mark email ${email.id} as read:`, error);
          success = false;
        }
      }

      // 3. Archive (if specified)
      if (actions.archive) {
        try {
          await this.gmail.archiveEmail(email.id);
          this.stats.emailsArchived++;
          appliedActions.push('archived');
        } catch (error) {
          console.error(`Failed to archive email ${email.id}:`, error);
          success = false;
        }
      }

      // Update statistics
      this.stats.emailsProcessed++;
      if (!success) this.stats.errors++;

      // Logging
      const processingTime = Date.now() - startTime;
      const methodIcon = classification.classifiedBy === 'rules' ? '📋' : '🤖';
      const actionsText = appliedActions.length > 0 ? appliedActions.join(', ') : 'no-action';
      
      if (ACTION_CONFIG.LOG_EMAIL_ACTIONS || !success) {
        console.log(`${methodIcon} ${classification.category}: ${actionsText} - "${email.subject}" (${processingTime}ms)`);
      }

      // Rate limiting delay
      if (ACTION_CONFIG.ACTION_DELAY_MS > 0) {
        await this.delay(ACTION_CONFIG.ACTION_DELAY_MS);
      }

      return success;

    } catch (error) {
      console.error(`Failed to apply actions to email ${email.id}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Apply actions to multiple emails in batch
   */
  async applyActionsToEmails(
    emails: EmailData[], 
    classifications: ClassificationResult[]
  ): Promise<{ successes: number; failures: number; details: Array<{ email: string; success: boolean }> }> {
    
    console.log(`⚡ Applying actions to ${emails.length} emails`);
    const startTime = Date.now();
    
    // Pre-warm label cache with categories we'll need
    const categories = [...new Set(classifications.map(c => c.category))];
    await this.labelManager.preWarmCache(categories);

    const results: Array<{ email: string; success: boolean }> = [];
    let successes = 0;
    let failures = 0;

    // Process emails in batches if configured
    const batchSize = ACTION_CONFIG.BATCH_SIZE;
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const emailBatch = emails.slice(i, i + batchSize);
      
      // Process batch
      const batchPromises = emailBatch.map(async (email) => {
        const classification = classifications.find(c => c.emailId === email.id);
        if (!classification) {
          console.warn(`No classification found for email ${email.id}, skipping`);
          return { email: email.subject, success: false };
        }

        const success = await this.applyActions(email, classification);
        return { email: email.subject, success };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Update counters
      batchResults.forEach(result => {
        if (result.success) successes++;
        else failures++;
      });

      // Delay between batches
      if (i + batchSize < emails.length && ACTION_CONFIG.ACTION_DELAY_MS > 0) {
        await this.delay(ACTION_CONFIG.ACTION_DELAY_MS * 2);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Email actions complete: ${successes}/${emails.length} successful (${totalTime}ms total)`);

    return { successes, failures, details: results };
  }

  /**
   * Apply custom action to a single email (for manual operations)
   */
  async applyCustomAction(
    email: EmailData, 
    action: { label?: string; markAsRead?: boolean; archive?: boolean }
  ): Promise<boolean> {
    try {
      if (ACTION_CONFIG.DRY_RUN_MODE) {
        console.log(`🔄 [DRY RUN] Would apply custom action to "${email.subject}": ${JSON.stringify(action)}`);
        return true;
      }

      // Apply label
      if (action.label) {
        await this.labelManager.applyLabel(email.id, action.label);
      }

      // Mark as read
      if (action.markAsRead) {
        await this.gmail.markAsRead(email.id);
      }

      // Archive
      if (action.archive) {
        await this.gmail.archiveEmail(email.id);
      }

      console.log(`✅ Applied custom action to "${email.subject}"`);
      return true;

    } catch (error) {
      console.error(`Failed to apply custom action to email ${email.id}:`, error);
      return false;
    }
  }

  /**
   * Undo actions on an email (limited - can't undo read status)
   */
  async undoActions(email: EmailData, actionsToUndo: { unarchive?: boolean; removeLabel?: string }): Promise<boolean> {
    try {
      if (ACTION_CONFIG.DRY_RUN_MODE) {
        console.log(`🔄 [DRY RUN] Would undo actions on "${email.subject}": ${JSON.stringify(actionsToUndo)}`);
        return true;
      }

      // Unarchive (move back to inbox)
      if (actionsToUndo.unarchive) {
        await this.gmail.users.messages.modify({
          userId: 'me',
          id: email.id,
          requestBody: {
            addLabelIds: ['INBOX'],
          },
        });
      }

      // Remove specific label
      if (actionsToUndo.removeLabel) {
        await this.labelManager.removeLabel(email.id, actionsToUndo.removeLabel);
      }

      console.log(`↩️ Undid actions on "${email.subject}"`);
      return true;

    } catch (error) {
      console.error(`Failed to undo actions on email ${email.id}:`, error);
      return false;
    }
  }

  /**
   * Get processing statistics
   */
  getStats(): typeof this.stats & { labelManagerStats: any } {
    return {
      ...this.stats,
      labelManagerStats: this.labelManager.getStats()
    };
  }

  /**
   * Reset statistics (called at start of each run)
   */
  resetStats(): void {
    this.stats = {
      emailsProcessed: 0,
      labelsApplied: 0,
      emailsMarkedRead: 0,
      emailsArchived: 0,
      errors: 0
    };
  }

  /**
   * Get label manager for direct access if needed
   */
  getLabelManager(): GmailLabelManager {
    return this.labelManager;
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}