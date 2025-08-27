import { EmailData, ClassificationResult, OrganizationStats } from './email-classification/types';
import { RuleBasedClassifier } from './email-classification/rule-classifier';
import { AIClassifier } from './email-classification/ai-classifier';
import { EmailActionApplier } from './email-actions/email-action-applier';
import { GmailService } from './gmail';
import { CONFIG } from './email-classification/classification-config';

/**
 * Main orchestrator for email organization
 * Coordinates classification and actions for non-job emails
 */
export class EmailOrganizerService {
  private ruleClassifier: RuleBasedClassifier;
  private aiClassifier: AIClassifier;
  private actionApplier: EmailActionApplier;
  private gmail: GmailService;

  constructor(gmailService: GmailService) {
    this.gmail = gmailService;
    this.ruleClassifier = new RuleBasedClassifier();
    this.aiClassifier = new AIClassifier();
    this.actionApplier = new EmailActionApplier(gmailService);
    
    console.log('🗂️ EmailOrganizerService initialized');
  }

  /**
   * Organize emails that were skipped during job processing
   * This is the main entry point called from JobProcessor
   */
  async organizeSkippedEmails(skippedEmails: EmailData[]): Promise<OrganizationStats> {
    console.log(`🗂️ Starting organization of ${skippedEmails.length} skipped emails`);
    const startTime = Date.now();
    
    // Reset statistics for this run
    this.resetStats();
    
    try {
      // Phase 1: Rule-based classification (fast & free)
      const ruleResults = await this.ruleClassifier.classifyEmails(skippedEmails);
      
      // Phase 2: Identify emails that need AI classification
      const lowConfidenceEmails = skippedEmails.filter(email => {
        const result = ruleResults.find(r => r.emailId === email.id);
        return result && result.confidence < CONFIG.RULE_CONFIDENCE_THRESHOLD;
      });
      
      let aiResults: ClassificationResult[] = [];
      
      if (lowConfidenceEmails.length > 0 && CONFIG.AI_FALLBACK_ENABLED) {
        console.log(`🤖 ${lowConfidenceEmails.length} emails need AI classification`);
        aiResults = await this.aiClassifier.classifyEmails(lowConfidenceEmails);
      }
      
      // Phase 3: Combine results (prefer AI results over low-confidence rules)
      const finalResults = this.combineClassificationResults(ruleResults, aiResults);
      
      // Phase 4: Apply Gmail actions based on classifications
      const actionResults = await this.actionApplier.applyActionsToEmails(skippedEmails, finalResults);
      
      // Phase 5: Generate statistics
      const stats = this.generateStats(finalResults, actionResults, startTime);
      
      this.logFinalStats(stats);
      return stats;
      
    } catch (error) {
      console.error('🚨 Email organization failed:', error);
      throw error;
    }
  }

  /**
   * Organize a single email (for testing or manual operations)
   */
  async organizeEmail(email: EmailData): Promise<ClassificationResult> {
    console.log(`🗂️ Organizing single email: "${email.subject}"`);
    
    try {
      // Try rules first
      let result = await this.ruleClassifier.classifyEmail(email);
      
      // Fall back to AI if low confidence
      if (result.confidence < CONFIG.RULE_CONFIDENCE_THRESHOLD && CONFIG.AI_FALLBACK_ENABLED) {
        console.log(`🤖 Using AI for low-confidence email: "${email.subject}"`);
        result = await this.aiClassifier.classifyEmail(email);
      }
      
      // Apply actions
      await this.actionApplier.applyActions(email, result);
      
      return result;
      
    } catch (error) {
      console.error(`Failed to organize email ${email.id}:`, error);
      throw error;
    }
  }

  /**
   * Test classification without applying actions (for debugging)
   */
  async testClassification(emails: EmailData[]): Promise<{
    ruleResults: ClassificationResult[];
    aiResults: ClassificationResult[];
    finalResults: ClassificationResult[];
    cost: number;
  }> {
    console.log(`🧪 Testing classification for ${emails.length} emails`);
    
    const ruleResults = await this.ruleClassifier.classifyEmails(emails);
    
    const lowConfidenceEmails = emails.filter(email => {
      const result = ruleResults.find(r => r.emailId === email.id);
      return result && result.confidence < CONFIG.RULE_CONFIDENCE_THRESHOLD;
    });
    
    const aiResults = lowConfidenceEmails.length > 0 
      ? await this.aiClassifier.classifyEmails(lowConfidenceEmails)
      : [];
    
    const finalResults = this.combineClassificationResults(ruleResults, aiResults);
    const cost = finalResults.reduce((sum, r) => sum + r.cost, 0);
    
    console.log(`🧪 Test complete: ${ruleResults.length} rule results, ${aiResults.length} AI results, cost: $${cost.toFixed(3)}`);
    
    return { ruleResults, aiResults, finalResults, cost };
  }

  /**
   * Get service statistics and health check
   */
  getServiceStats(): {
    isHealthy: boolean;
    ruleClassifier: any;
    aiClassifier: any;
    actionApplier: any;
    config: typeof CONFIG;
  } {
    return {
      isHealthy: true,
      ruleClassifier: this.ruleClassifier.getStats(),
      aiClassifier: this.aiClassifier.getCostStats(),
      actionApplier: this.actionApplier.getStats(),
      config: CONFIG
    };
  }

  /**
   * Combine rule-based and AI classification results
   * AI results override low-confidence rule results
   */
  private combineClassificationResults(
    ruleResults: ClassificationResult[],
    aiResults: ClassificationResult[]
  ): ClassificationResult[] {
    const combined: ClassificationResult[] = [];
    
    for (const ruleResult of ruleResults) {
      // Check if we have an AI result for this email
      const aiResult = aiResults.find(ai => ai.emailId === ruleResult.emailId);
      
      if (aiResult) {
        // Use AI result (it was needed because rule confidence was low)
        combined.push(aiResult);
      } else {
        // Use rule result (it had high confidence)
        combined.push(ruleResult);
      }
    }
    
    return combined;
  }

  /**
   * Generate comprehensive statistics
   */
  private generateStats(
    classifications: ClassificationResult[],
    actionResults: { successes: number; failures: number },
    _startTime: number
  ): OrganizationStats {
    const totalProcessed = classifications.length;
    const ruleClassified = classifications.filter(c => c.classifiedBy === 'rules').length;
    const aiClassified = classifications.filter(c => c.classifiedBy === 'ai').length;
    const totalCost = classifications.reduce((sum, c) => sum + c.cost, 0);
    const avgProcessingTime = totalProcessed > 0 
      ? classifications.reduce((sum, c) => sum + c.processingTime, 0) / totalProcessed 
      : 0;
    const successRate = totalProcessed > 0 ? actionResults.successes / totalProcessed : 0;
    
    return {
      totalProcessed,
      ruleClassified,
      aiClassified,
      totalCost,
      avgProcessingTime,
      successRate,
      errors: [] // Could be populated with specific error messages
    };
  }

  /**
   * Reset all statistics for a new run
   */
  private resetStats(): void {
    this.aiClassifier.resetCostTracking();
    this.actionApplier.resetStats();
  }

  /**
   * Log comprehensive final statistics
   */
  private logFinalStats(stats: OrganizationStats): void {
    const efficiency = ((stats.ruleClassified / stats.totalProcessed) * 100).toFixed(1);
    const costSavings = stats.totalProcessed * 0.002 - stats.totalCost;
    
    console.log('📊 Email Organization Complete:');
    console.log(`   📧 Processed: ${stats.totalProcessed} emails`);
    console.log(`   📋 Rules: ${stats.ruleClassified} (${efficiency}% efficiency)`);
    console.log(`   🤖 AI: ${stats.aiClassified}`);
    console.log(`   💰 Cost: $${stats.totalCost.toFixed(3)} (saved $${costSavings.toFixed(3)})`);
    console.log(`   ⚡ Avg time: ${stats.avgProcessingTime.toFixed(0)}ms per email`);
    console.log(`   ✅ Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Any cleanup needed for classifiers or action appliers
    console.log('🧹 EmailOrganizerService cleanup complete');
  }
}