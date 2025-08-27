import { EmailActions, EmailCategory } from '../email-classification/types';

/**
 * Email action configuration - easily customizable without code changes
 * Defines what happens to emails after classification
 */
export const EMAIL_ACTION_CONFIG: Record<EmailCategory, EmailActions> = {
  // SECURITY - Keep unread and visible (most important)
  security: {
    label: 'Email/Security',
    markAsRead: false,  // Keep unread - user must see security alerts
    archive: false,     // Keep in inbox for immediate attention
    priority: 'keep-inbox'
  },

  // FINANCE - Keep unread and visible (important)
  finance: {
    label: 'Email/Finance',
    markAsRead: false,  // Keep unread - bills and payments need attention
    archive: false,     // Keep in inbox
    priority: 'keep-inbox'
  },

  // SHOPPING - Keep visible but can mark read if configured
  shopping: {
    label: 'Email/Shopping',
    markAsRead: false,  // User might want to track orders
    archive: false,     // Keep in inbox
    priority: 'keep-inbox'
  },

  // TRAVEL - Keep visible and unread (important confirmations)
  travel: {
    label: 'Email/Travel',
    markAsRead: false,  // Travel confirmations are important
    archive: false,     // Keep in inbox
    priority: 'keep-inbox'
  },

  // HEALTH - Keep visible and unread (important)
  health: {
    label: 'Email/Health',
    markAsRead: false,  // Health information is important
    archive: false,     // Keep in inbox
    priority: 'keep-inbox'
  },

  // PERSONAL - Keep as-is (default behavior)
  personal: {
    label: 'Email/Personal',
    markAsRead: false,  // Keep personal emails unread
    archive: false,     // Keep in inbox
    priority: 'keep-inbox'
  },

  // NEWSLETTER - Auto-read and archive (low priority)
  newsletter: {
    label: 'Email/Newsletter',
    markAsRead: true,   // Auto-read newsletters to clean inbox
    archive: true,      // Archive to reduce inbox clutter
    priority: 'archive'
  },

  // PROMOTIONAL - Auto-read and archive (lowest priority)
  promotional: {
    label: 'Email/Promotional',
    markAsRead: true,   // Auto-read promotions
    archive: true,      // Archive promotional content
    priority: 'archive'
  },

  // ENTERTAINMENT - Auto-read and archive
  entertainment: {
    label: 'Email/Entertainment',
    markAsRead: true,   // Auto-read entertainment emails
    archive: true,      // Archive to clean inbox
    priority: 'archive'
  },

  // AUTOMATED - Mark read but keep in inbox (might contain useful info)
  automated: {
    label: 'Email/Automated',
    markAsRead: true,   // Auto-read system notifications
    archive: false,     // Keep in inbox (confirmations might be needed)
    priority: 'auto-read'
  }
};

/**
 * Gmail label color configuration using Gmail's predefined palette
 * Gmail only accepts specific color combinations from their predefined set
 */
export const LABEL_COLORS: Record<EmailCategory, { backgroundColor: string; textColor: string }> = {
  security: { backgroundColor: '#d50000', textColor: '#ffffff' },      // Gmail red - urgent
  finance: { backgroundColor: '#0d7377', textColor: '#ffffff' },       // Gmail teal - money
  shopping: { backgroundColor: '#f4511e', textColor: '#ffffff' },      // Gmail orange - orders
  travel: { backgroundColor: '#3367d6', textColor: '#ffffff' },        // Gmail blue - travel
  health: { backgroundColor: '#0b8043', textColor: '#ffffff' },        // Gmail green - health
  personal: { backgroundColor: '#8e24aa', textColor: '#ffffff' },      // Gmail purple - personal
  newsletter: { backgroundColor: '#7627bb', textColor: '#ffffff' },    // Gmail violet - newsletters
  promotional: { backgroundColor: '#d81b60', textColor: '#ffffff' },   // Gmail pink - promotions
  entertainment: { backgroundColor: '#ff6f00', textColor: '#ffffff' }, // Gmail amber - fun
  automated: { backgroundColor: '#5f6368', textColor: '#ffffff' }      // Gmail gray - system
};

/**
 * Configuration options that can be overridden by environment variables
 */
export const ACTION_CONFIG = {
  // Feature toggles
  CREATE_GMAIL_LABELS: process.env.EMAIL_CREATE_LABELS !== 'false',
  APPLY_EMAIL_ACTIONS: process.env.EMAIL_APPLY_ACTIONS !== 'false',
  DRY_RUN_MODE: process.env.EMAIL_DRY_RUN === 'true',
  USE_LABEL_COLORS: process.env.EMAIL_USE_LABEL_COLORS !== 'false',
  
  // Behavioral overrides
  AUTO_ARCHIVE_NEWSLETTERS: process.env.EMAIL_AUTO_ARCHIVE_NEWSLETTERS !== 'false',
  AUTO_ARCHIVE_PROMOTIONS: process.env.EMAIL_AUTO_ARCHIVE_PROMOTIONS !== 'false',
  KEEP_SECURITY_UNREAD: process.env.EMAIL_KEEP_SECURITY_UNREAD !== 'false',
  KEEP_FINANCE_UNREAD: process.env.EMAIL_KEEP_FINANCE_UNREAD !== 'false',
  
  // Performance settings
  ACTION_DELAY_MS: parseInt(process.env.EMAIL_ACTION_DELAY_MS || '150'),
  BATCH_SIZE: parseInt(process.env.EMAIL_ACTION_BATCH_SIZE || '1'),
  
  // Logging
  LOG_EMAIL_ACTIONS: process.env.EMAIL_LOG_ACTIONS === 'true'
} as const;

/**
 * Get email actions for a category with environment variable overrides
 */
export function getEmailActions(category: EmailCategory): EmailActions {
  const baseActions = EMAIL_ACTION_CONFIG[category];
  
  // Apply environment variable overrides
  let actions = { ...baseActions };
  
  // Override newsletter archiving
  if (category === 'newsletter' && !ACTION_CONFIG.AUTO_ARCHIVE_NEWSLETTERS) {
    actions.archive = false;
    actions.priority = 'auto-read';
  }
  
  // Override promotional archiving
  if (category === 'promotional' && !ACTION_CONFIG.AUTO_ARCHIVE_PROMOTIONS) {
    actions.archive = false;
    actions.priority = 'auto-read';
  }
  
  // Override security read status
  if (category === 'security' && !ACTION_CONFIG.KEEP_SECURITY_UNREAD) {
    actions.markAsRead = true;
  }
  
  // Override finance read status
  if (category === 'finance' && !ACTION_CONFIG.KEEP_FINANCE_UNREAD) {
    actions.markAsRead = true;
  }
  
  return actions;
}

/**
 * Get label color for a category
 */
export function getLabelColor(category: EmailCategory): { backgroundColor: string; textColor: string } {
  return LABEL_COLORS[category] || LABEL_COLORS.personal;
}

/**
 * Get label name for a category
 */
export function getLabelName(category: EmailCategory): string {
  const categoryNames: Record<EmailCategory, string> = {
    security: 'Email/Security',
    finance: 'Email/Finance',
    shopping: 'Email/Shopping',
    travel: 'Email/Travel',
    health: 'Email/Health',
    personal: 'Email/Personal',
    newsletter: 'Email/Newsletter',
    promotional: 'Email/Promotional',
    entertainment: 'Email/Entertainment',
    automated: 'Email/Automated'
  };
  
  return categoryNames[category] || 'Email/Other';
}