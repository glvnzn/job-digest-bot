import OpenAI from 'openai';
import { EmailData, ClassificationResult, EmailCategory } from './types';
import { CONFIG } from './classification-config';

/**
 * AI-powered email classifier for complex/ambiguous emails
 * Only used when rule-based classification has low confidence
 */
export class AIClassifier {
  private openai: OpenAI;
  private costTracker: { totalCost: number; emailsProcessed: number } = { totalCost: 0, emailsProcessed: 0 };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log(`🤖 AIClassifier initialized (max cost per run: $${CONFIG.MAX_AI_COST_PER_RUN})`);
  }

  /**
   * Classify a single email using AI
   */
  async classifyEmail(email: EmailData): Promise<ClassificationResult> {
    const startTime = Date.now();

    // Cost protection
    if (this.costTracker.totalCost >= CONFIG.MAX_AI_COST_PER_RUN) {
      console.warn(`⚠️ AI cost limit reached ($${CONFIG.MAX_AI_COST_PER_RUN}), falling back to default classification`);
      return this.createFallbackResult(email.id, Date.now() - startTime);
    }

    try {
      const result = await this.callOpenAI(email);
      const processingTime = Date.now() - startTime;
      
      // Update cost tracking
      this.costTracker.totalCost += CONFIG.AI_COST_PER_EMAIL;
      this.costTracker.emailsProcessed++;

      if (CONFIG.DETAILED_LOGGING) {
        console.log(`🤖 AI classified: "${email.subject}" → ${result.category} (confidence: ${result.confidence}, time: ${processingTime}ms, cost: $${CONFIG.AI_COST_PER_EMAIL})`);
      }

      return {
        emailId: email.id,
        category: result.category,
        confidence: result.confidence,
        classifiedBy: 'ai',
        cost: CONFIG.AI_COST_PER_EMAIL,
        processingTime
      };

    } catch (error) {
      console.error(`🤖 AI classification failed for email ${email.id}:`, error);
      return this.createFallbackResult(email.id, Date.now() - startTime);
    }
  }

  /**
   * Batch classify emails with cost protection and rate limiting
   */
  async classifyEmails(emails: EmailData[]): Promise<ClassificationResult[]> {
    console.log(`🤖 Starting AI classification for ${emails.length} emails`);
    
    const maxEmailsWithinBudget = Math.floor((CONFIG.MAX_AI_COST_PER_RUN - this.costTracker.totalCost) / CONFIG.AI_COST_PER_EMAIL);
    const emailsToProcess = emails.slice(0, maxEmailsWithinBudget);
    const emailsSkipped = emails.slice(maxEmailsWithinBudget);
    
    if (emailsSkipped.length > 0) {
      console.warn(`⚠️ Skipping ${emailsSkipped.length} emails due to cost limit ($${CONFIG.MAX_AI_COST_PER_RUN})`);
    }

    const results: ClassificationResult[] = [];
    
    // Process emails with rate limiting
    for (const email of emailsToProcess) {
      const result = await this.classifyEmail(email);
      results.push(result);
      
      // Rate limiting delay between AI calls
      if (CONFIG.AI_PROCESSING_DELAY_MS > 0) {
        await this.delay(CONFIG.AI_PROCESSING_DELAY_MS);
      }
    }

    // Add fallback results for skipped emails
    for (const email of emailsSkipped) {
      results.push(this.createFallbackResult(email.id, 0));
    }

    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    console.log(`🤖 AI classification complete: ${emailsToProcess.length} processed, ${emailsSkipped.length} skipped, cost: $${totalCost.toFixed(3)}`);

    return results;
  }

  /**
   * Call OpenAI API for email classification
   */
  private async callOpenAI(email: EmailData): Promise<{ category: EmailCategory; confidence: number }> {
    const prompt = this.buildClassificationPrompt(email);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert email classifier. Return only valid JSON with category and confidence.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 100
    });

    const content = response.choices[0].message.content?.trim() || '{}';
    
    // Clean up any markdown formatting
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```/g, '')
      .trim();

    const result = JSON.parse(cleanContent);
    
    return {
      category: this.validateCategory(result.category) || 'personal',
      confidence: this.validateConfidence(result.confidence) || 0.7
    };
  }

  /**
   * Build the AI classification prompt
   */
  private buildClassificationPrompt(email: EmailData): string {
    return `
Classify this email into the most appropriate category:

From: ${email.from}
Subject: ${email.subject}
Content Preview: ${email.body.substring(0, 400)}...

Return JSON in this exact format:
{
  "category": "category_name",
  "confidence": 0.85
}

Available categories:
- security: 2FA codes, login alerts, account security, password resets
- finance: Banking, payments, bills, receipts, financial statements
- shopping: Orders, shipping, e-commerce, product receipts
- newsletter: Subscriptions, mailing lists, weekly/daily updates
- promotional: Marketing emails, sales, deals, advertisements
- automated: System notifications, confirmations, auto-generated messages
- travel: Flight bookings, hotel reservations, travel confirmations
- health: Medical appointments, health records, pharmacy notifications
- entertainment: Games, streaming services, social media, entertainment
- personal: Friends, family, personal correspondence, everything else

Guidelines:
- Use high confidence (0.8-0.9) for clear matches
- Use medium confidence (0.6-0.8) for likely matches
- Use lower confidence (0.5-0.6) for uncertain cases
- Default to "personal" category when unclear
`.trim();
  }

  /**
   * Validate and sanitize category from AI response
   */
  private validateCategory(category: any): EmailCategory | null {
    const validCategories: EmailCategory[] = [
      'security', 'finance', 'shopping', 'newsletter', 'promotional',
      'automated', 'travel', 'health', 'entertainment', 'personal'
    ];

    if (typeof category === 'string' && validCategories.includes(category as EmailCategory)) {
      return category as EmailCategory;
    }

    return null;
  }

  /**
   * Validate and sanitize confidence from AI response
   */
  private validateConfidence(confidence: any): number | null {
    if (typeof confidence === 'number' && confidence >= 0 && confidence <= 1) {
      return confidence;
    }
    
    // Try to parse as string
    if (typeof confidence === 'string') {
      const parsed = parseFloat(confidence);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }

    return null;
  }

  /**
   * Create a fallback result when AI classification fails
   */
  private createFallbackResult(emailId: string, processingTime: number): ClassificationResult {
    return {
      emailId,
      category: 'personal',
      confidence: 0.5,
      classifiedBy: 'ai',
      cost: 0, // No cost for fallback
      processingTime
    };
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cost tracking statistics
   */
  getCostStats(): { totalCost: number; emailsProcessed: number; avgCostPerEmail: number } {
    return {
      totalCost: this.costTracker.totalCost,
      emailsProcessed: this.costTracker.emailsProcessed,
      avgCostPerEmail: this.costTracker.emailsProcessed > 0 
        ? this.costTracker.totalCost / this.costTracker.emailsProcessed 
        : 0
    };
  }

  /**
   * Reset cost tracking (called at start of each processing run)
   */
  resetCostTracking(): void {
    this.costTracker = { totalCost: 0, emailsProcessed: 0 };
  }
}