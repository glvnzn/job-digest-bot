// Re-export API types for easy importing
export * from './api';

// Common utility types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Frontend-specific types
export interface JobFilters {
  search?: string;
  company?: string;
  location?: string;
  remote?: boolean;
  minRelevanceScore?: number;
  maxRelevanceScore?: number;
  datePosted?: 'today' | 'week' | 'month' | 'all';
  limit?: number;
  offset?: number;
}

export interface UserSettings {
  email?: {
    enabled?: boolean;
    weeklyDigest?: boolean;
    relevanceThreshold?: number;
  };
  web?: {
    browserNotifications?: boolean;
    darkMode?: boolean;
    jobsPerPage?: number;
  };
  filters?: {
    minRelevanceScore?: number;
    excludeCompanies?: string[];
    preferredLocations?: string[];
  };
}