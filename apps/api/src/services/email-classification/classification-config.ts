import { ClassificationRule, EmailCategory } from './types';

/**
 * Email classification rules - easily configurable without code changes
 * Rules are checked in priority order (higher priority first)
 */
export const CLASSIFICATION_RULES: ClassificationRule[] = [
  // SECURITY - Highest priority (95% confidence)
  {
    category: 'security',
    confidence: 0.95,
    priority: 100,
    contentPatterns: [
      'security alert', 'login attempt', 'password changed', 'password reset',
      'verification code', '2fa', 'two-factor', 'suspicious activity',
      'account locked', 'unauthorized access', 'breach', 'verify your account',
      'confirm your identity', 'security notification'
    ],
    fromPatterns: [
      'security@', 'noreply@', 'no-reply@', 'alert@', 'notifications@',
      'account@', 'support@'
    ],
    subjectPatterns: [
      'security alert', 'action required', 'verify', 'confirm', 'suspicious'
    ]
  },

  // FINANCE - High priority (90% confidence) 
  {
    category: 'finance',
    confidence: 0.90,
    priority: 90,
    contentPatterns: [
      'bank', 'payment', 'invoice', 'receipt', 'statement', 'bill',
      'transaction', 'balance', 'refund', 'charge', 'deposit',
      'withdrawal', 'transfer', 'account summary'
    ],
    fromPatterns: [
      'paypal', 'stripe', 'bank', 'billing@', 'finance@', 'payments@',
      'invoices@', 'visa', 'mastercard', 'amex'
    ],
    subjectPatterns: [
      'payment', 'invoice', 'receipt', 'statement', 'bill', 'refund'
    ]
  },

  // SHOPPING - High confidence (85%)
  {
    category: 'shopping',
    confidence: 0.85,
    priority: 80,
    contentPatterns: [
      'order', 'shipping', 'delivery', 'tracking', 'package',
      'shipped', 'cart', 'checkout', 'purchase', 'your order',
      'order confirmation', 'delivery confirmation'
    ],
    fromPatterns: [
      'amazon', 'ebay', 'etsy', 'shopify', 'orders@', 'shipping@',
      'store@', 'shop@'
    ],
    subjectPatterns: [
      'order', 'shipping', 'delivery', 'tracking', 'shipped'
    ]
  },

  // TRAVEL - High confidence (85%)
  {
    category: 'travel',
    confidence: 0.85,
    priority: 75,
    contentPatterns: [
      'flight', 'booking', 'reservation', 'hotel', 'trip', 'travel',
      'itinerary', 'boarding pass', 'check-in', 'airline', 'airport'
    ],
    fromPatterns: [
      'booking', 'expedia', 'airbnb', 'airlines', 'hotel', 'travel',
      'reservations@'
    ],
    subjectPatterns: [
      'booking', 'flight', 'hotel', 'trip', 'reservation', 'itinerary'
    ]
  },

  // HEALTH - High confidence (85%)
  {
    category: 'health',
    confidence: 0.85,
    priority: 75,
    contentPatterns: [
      'appointment', 'doctor', 'medical', 'health', 'clinic', 'hospital',
      'prescription', 'pharmacy', 'vaccine', 'test results',
      'dental', 'checkup'
    ],
    fromPatterns: [
      'health', 'medical', 'clinic', 'hospital', 'doctor', 'pharmacy'
    ],
    subjectPatterns: [
      'appointment', 'medical', 'health', 'doctor', 'clinic'
    ]
  },

  // NEWSLETTER - Medium-high confidence (85%)
  {
    category: 'newsletter',
    confidence: 0.85,
    priority: 70,
    contentPatterns: [
      'newsletter', 'unsubscribe', 'weekly digest', 'daily digest',
      'mailing list', 'email preferences', 'subscription',
      'roundup', 'update'
    ],
    fromPatterns: [
      'newsletter@', 'digest@', 'updates@', 'mailer@', 'news@',
      'subscriptions@'
    ],
    subjectPatterns: [
      'newsletter', 'digest', 'weekly', 'daily', 'roundup'
    ]
  },

  // PROMOTIONAL - Medium confidence (80%)
  {
    category: 'promotional',
    confidence: 0.80,
    priority: 60,
    contentPatterns: [
      'sale', 'discount', 'deal', 'offer', 'coupon', '% off',
      'limited time', 'exclusive', 'promotion', 'special offer',
      'act now', 'don\'t miss'
    ],
    fromPatterns: [
      'marketing@', 'promo@', 'offers@', 'deals@', 'sales@'
    ],
    subjectPatterns: [
      'sale', 'discount', 'offer', 'deal', 'promotion', '% off'
    ]
  },

  // AUTOMATED - Medium confidence (80%)
  {
    category: 'automated',
    confidence: 0.80,
    priority: 50,
    contentPatterns: [
      'confirmation', 'automated', 'system', 'notification',
      'alert', 'reminder', 'auto-generated', 'do not reply'
    ],
    fromPatterns: [
      'noreply@', 'no-reply@', 'automated@', 'system@',
      'notifications@', 'alerts@'
    ],
    subjectPatterns: [
      'confirmation', 'notification', 'reminder', 'alert', 'automated'
    ]
  },

  // ENTERTAINMENT - Lower confidence (75%)
  {
    category: 'entertainment',
    confidence: 0.75,
    priority: 40,
    contentPatterns: [
      'game', 'gaming', 'stream', 'movie', 'music', 'podcast',
      'video', 'entertainment', 'social'
    ],
    fromPatterns: [
      'netflix', 'spotify', 'youtube', 'twitch', 'gaming',
      'facebook', 'twitter', 'instagram'
    ],
    subjectPatterns: [
      'game', 'stream', 'movie', 'music', 'video'
    ]
  }
];

/**
 * Configuration thresholds
 */
export const CONFIG = {
  // Classification confidence thresholds
  RULE_CONFIDENCE_THRESHOLD: parseFloat(process.env.EMAIL_RULE_CONFIDENCE_THRESHOLD || '0.8'),
  AI_FALLBACK_ENABLED: process.env.EMAIL_AI_FALLBACK !== 'false',
  
  // Cost controls
  MAX_AI_COST_PER_RUN: parseFloat(process.env.EMAIL_MAX_AI_COST_PER_RUN || '0.10'),
  AI_COST_PER_EMAIL: parseFloat(process.env.EMAIL_AI_COST_PER_EMAIL || '0.002'),
  
  // Performance settings
  EMAIL_PROCESSING_DELAY_MS: parseInt(process.env.EMAIL_PROCESSING_DELAY_MS || '100'),
  AI_PROCESSING_DELAY_MS: parseInt(process.env.EMAIL_AI_DELAY_MS || '200'),
  
  // Logging
  DETAILED_LOGGING: process.env.EMAIL_DETAILED_LOGGING === 'true',
  LOG_CLASSIFICATION_RESULTS: process.env.EMAIL_LOG_RESULTS === 'true'
} as const;

/**
 * Get classification rule by category (for testing/debugging)
 */
export function getRuleByCategory(category: EmailCategory): ClassificationRule | undefined {
  return CLASSIFICATION_RULES.find(rule => rule.category === category);
}

/**
 * Get all rules sorted by priority (highest first)
 */
export function getRulesByPriority(): ClassificationRule[] {
  return [...CLASSIFICATION_RULES].sort((a, b) => b.priority - a.priority);
}