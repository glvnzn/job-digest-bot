// Shared types for email classification and organization
export interface EmailData {
  id: string;
  subject: string;
  from: string;
  body: string;
  date: Date;
}

export interface ClassificationResult {
  emailId: string;
  category: EmailCategory;
  confidence: number;
  classifiedBy: 'rules' | 'ai';
  cost: number;
  processingTime: number;
}

export type EmailCategory = 
  | 'security' 
  | 'finance' 
  | 'shopping' 
  | 'newsletter' 
  | 'promotional' 
  | 'automated' 
  | 'travel' 
  | 'health' 
  | 'entertainment' 
  | 'personal';

export interface EmailActions {
  label: string;
  markAsRead: boolean;
  archive: boolean;
  priority: 'keep-inbox' | 'archive' | 'auto-read';
}

export interface OrganizationStats {
  totalProcessed: number;
  ruleClassified: number;
  aiClassified: number;
  totalCost: number;
  avgProcessingTime: number;
  successRate: number;
  errors: string[];
}

export interface ClassificationRule {
  category: EmailCategory;
  confidence: number;
  contentPatterns: string[];
  fromPatterns: string[];
  subjectPatterns: string[];
  priority: number; // Higher priority rules checked first
}