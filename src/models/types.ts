export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  description: string;
  requirements: string[];
  applyUrl: string;
  salary?: string;
  postedDate: Date;
  source: string;
  relevanceScore: number;
  emailMessageId: string;
  processed: boolean;
  createdAt: Date;
}

export interface ResumeAnalysis {
  skills: string[];
  experience: string[];
  preferredRoles: string[];
  seniority: string;
  analyzedAt: Date;
}

export interface ProcessedEmail {
  messageId: string;
  subject: string;
  from: string;
  processedAt: Date;
  jobsExtracted: number;
  deleted: boolean;
}

export interface JobMatchCriteria {
  requiredSkills: string[];
  preferredLocation: string[];
  minRelevanceScore: number;
  mustBeRemote: boolean;
}
