import { EmailData, ClassificationResult, EmailCategory } from './types';
import { CLASSIFICATION_RULES, CONFIG, getRulesByPriority } from './classification-config';

/**
 * Rule-based email classifier - fast, free, handles common patterns
 */
export class RuleBasedClassifier {
  private rules: typeof CLASSIFICATION_RULES;

  constructor() {
    this.rules = getRulesByPriority(); // Sort by priority for efficient processing
    console.log(`📋 RuleBasedClassifier initialized with ${this.rules.length} rules`);
  }

  /**
   * Classify a single email using rules
   */
  async classifyEmail(email: EmailData): Promise<ClassificationResult> {
    const startTime = Date.now();
    
    try {
      const normalizedEmail = this.normalizeEmailContent(email);
      const result = this.findMatchingRule(normalizedEmail, email.id);
      
      const processingTime = Date.now() - startTime;
      
      // DEBUG: Always log rule classification attempts in production
      console.log(`📋 Rule attempt: "${email.subject.substring(0, 50)}..." from "${email.from.substring(0, 30)}..." → ${result.category} (confidence: ${result.confidence.toFixed(2)})`);
      
      if (CONFIG.DETAILED_LOGGING) {
        console.log(`📋 Rule classified: "${email.subject}" → ${result.category} (confidence: ${result.confidence}, time: ${processingTime}ms)`);
      }

      return {
        ...result,
        processingTime,
        cost: 0, // Rules are free!
        classifiedBy: 'rules'
      };

    } catch (error) {
      console.error(`Rule classification failed for email ${email.id}:`, error);
      
      // Return low-confidence fallback
      return {
        emailId: email.id,
        category: 'personal',
        confidence: 0.1,
        classifiedBy: 'rules',
        cost: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Batch classify multiple emails
   */
  async classifyEmails(emails: EmailData[]): Promise<ClassificationResult[]> {
    console.log(`📋 Starting rule-based classification for ${emails.length} emails`);
    const startTime = Date.now();
    
    const results = await Promise.all(
      emails.map(email => this.classifyEmail(email))
    );
    
    const totalTime = Date.now() - startTime;
    const highConfidenceCount = results.filter(r => r.confidence >= CONFIG.RULE_CONFIDENCE_THRESHOLD).length;
    
    console.log(`📊 Rule classification complete: ${highConfidenceCount}/${emails.length} high-confidence matches (${totalTime}ms total)`);
    
    return results;
  }

  /**
   * Normalize email content for consistent matching
   */
  private normalizeEmailContent(email: EmailData): {
    subject: string;
    from: string;
    body: string;
  } {
    return {
      subject: email.subject.toLowerCase().trim(),
      from: email.from.toLowerCase().trim(),
      body: email.body.toLowerCase().substring(0, 500).trim() // First 500 chars for performance
    };
  }

  /**
   * Find the best matching rule for an email
   */
  private findMatchingRule(normalizedEmail: { subject: string; from: string; body: string }, emailId: string): {
    emailId: string;
    category: EmailCategory;
    confidence: number;
  } {
    
    // Check rules in priority order (highest priority first)
    for (const rule of this.rules) {
      const matchScore = this.calculateRuleMatchScore(normalizedEmail, rule);
      
      if (matchScore >= rule.confidence) {
        return {
          emailId,
          category: rule.category,
          confidence: Math.min(matchScore, 0.98) // Cap at 98% to leave room for AI
        };
      }
    }
    
    // No high-confidence rule match found
    return {
      emailId,
      category: 'personal',
      confidence: 0.3 // Low confidence indicates need for AI classification
    };
  }

  /**
   * Calculate how well an email matches a specific rule
   */
  private calculateRuleMatchScore(
    normalizedEmail: { subject: string; from: string; body: string },
    rule: typeof CLASSIFICATION_RULES[0]
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Check content patterns (body + subject) - weight: 0.6
    const contentText = `${normalizedEmail.subject} ${normalizedEmail.body}`;
    const contentMatches = rule.contentPatterns.filter(pattern => 
      contentText.includes(pattern)
    );
    if (rule.contentPatterns.length > 0) {
      const contentScore = contentMatches.length > 0 ? 0.6 : 0; // Binary: any match = full score
      score += contentScore;
      totalWeight += 0.6;
    }

    // Check from patterns - weight: 0.3  
    const fromMatches = rule.fromPatterns.filter(pattern => 
      normalizedEmail.from.includes(pattern)
    );
    if (rule.fromPatterns.length > 0) {
      const fromScore = fromMatches.length > 0 ? 0.3 : 0; // Binary: any match = full score
      score += fromScore;
      totalWeight += 0.3;
    }

    // Check subject-specific patterns - weight: 0.1 (bonus points)
    const subjectMatches = rule.subjectPatterns.filter(pattern => 
      normalizedEmail.subject.includes(pattern)
    );
    if (rule.subjectPatterns.length > 0) {
      const subjectScore = subjectMatches.length > 0 ? 0.1 : 0; // Binary: any match = full score
      score += subjectScore;
      totalWeight += 0.1;
    }

    // If we have any matches, boost the score for this rule
    const finalScore = totalWeight > 0 ? score / totalWeight : 0;
    
    // DEBUG: Log matching details for troubleshooting
    if (contentMatches.length > 0 || fromMatches.length > 0 || subjectMatches.length > 0) {
      console.log(`🔍 Rule "${rule.category}" matches: content=${contentMatches.length}, from=${fromMatches.length}, subject=${subjectMatches.length}, score=${finalScore.toFixed(2)}`);
    }

    return finalScore;
  }

  /**
   * Get classification statistics for monitoring
   */
  getStats(): { rulesCount: number; avgProcessingTime: number } {
    return {
      rulesCount: this.rules.length,
      avgProcessingTime: 5 // Rules are very fast, ~5ms average
    };
  }

  /**
   * Test a specific rule against sample text (for debugging)
   */
  testRule(category: EmailCategory, sampleText: string): { matches: boolean; score: number } {
    const rule = this.rules.find(r => r.category === category);
    if (!rule) {
      return { matches: false, score: 0 };
    }

    const normalizedSample = {
      subject: sampleText.toLowerCase(),
      from: sampleText.toLowerCase(),
      body: sampleText.toLowerCase()
    };

    const score = this.calculateRuleMatchScore(normalizedSample, rule);
    return {
      matches: score >= rule.confidence,
      score
    };
  }
}