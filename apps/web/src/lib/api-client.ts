// API client using auto-generated OpenAPI types
import { components } from '@job-digest/shared-types/api';

// Export types from generated schema
export type Job = components['schemas']['Job'];
export type User = components['schemas']['User'];
export type JobStage = components['schemas']['JobStage'];
export type UserJob = components['schemas']['UserJob'];
export type PaginationMeta = components['schemas']['PaginationMeta'];
export type JobFilters = components['schemas']['JobFilters'];

// Use generated ApiResponse schema instead of custom interface
export type ApiResponse<T = unknown> = Omit<components['schemas']['ApiResponse'], 'data'> & {
  data?: T;
};

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  // Set authentication token (called by hooks)
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add authorization header if token is available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    const config: RequestInit = {
      headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data || data, // Handle both wrapped and direct responses
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Jobs API - fully typed
  jobs = {
    // GET /api/v1/jobs - Get all jobs with optional filters
    getAll: async (filters?: JobFilters): Promise<PaginatedResponse<Job>> => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.company) params.append('company', filters.company);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.remote !== undefined) params.append('remote', String(filters.remote));
      if (filters?.minRelevanceScore) params.append('minRelevanceScore', String(filters.minRelevanceScore));
      if (filters?.untracked !== undefined) params.append('untracked', String(filters.untracked));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const queryString = params.toString();
      const endpoint = `/api/v1/jobs${queryString ? `?${queryString}` : ''}`;
      
      // Make the request directly to get the full response structure
      const url = `${this.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      try {
        const response = await fetch(url, { headers });
        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            data: [],
            meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
          };
        }

        if (data.success && data.data && data.meta) {
          return {
            success: true,
            data: data.data,
            meta: {
              page: Math.floor((data.meta.offset || 0) / (data.meta.limit || 20)) + 1,
              limit: data.meta.limit || 20,
              total: data.meta.total || 0,
              totalPages: Math.ceil((data.meta.total || 0) / (data.meta.limit || 20))
            },
          };
        }

        return {
          success: false,
          data: [],
          error: 'Invalid response from server',
          meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      } catch (error) {
        console.error('Error fetching jobs:', error);
        return {
          success: false,
          data: [],
          error: error instanceof Error ? error.message : 'Network error',
          meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      }
    },

    // GET /api/v1/jobs/:id - Get specific job
    getById: async (id: string): Promise<ApiResponse<Job>> => {
      return this.request<Job>(`/api/v1/jobs/${id}`);
    },

    // POST /api/v1/jobs/:id/save - Save/track a job
    track: async (id: string): Promise<ApiResponse<UserJob>> => {
      return this.request<UserJob>(`/api/v1/jobs/${id}/save`, {
        method: 'POST',
      });
    },

    // DELETE /api/v1/jobs/:id/unsave - Untrack a job
    untrack: async (id: string): Promise<ApiResponse<void>> => {
      return this.request<void>(`/api/v1/jobs/${id}/unsave`, {
        method: 'DELETE',
      });
    },
  };

  // User Jobs API
  userJobs = {
    // GET /api/v1/jobs/user/saved - Get user's tracked jobs
    getAll: async (): Promise<ApiResponse<UserJob[]>> => {
      return this.request<UserJob[]>('/api/v1/jobs/user/saved');
    },

    // PUT /api/v1/jobs/:id/stage - Update job stage
    updateStage: async (jobId: string, stageId: string): Promise<ApiResponse<UserJob>> => {
      return this.request<UserJob>(`/api/v1/jobs/${jobId}/stage`, {
        method: 'PUT',
        body: JSON.stringify({ stageId }),
      });
    },

    // PUT /api/v1/jobs/:id/stage - Update job notes (uses same endpoint)
    updateNotes: async (jobId: string, notes: string): Promise<ApiResponse<UserJob>> => {
      return this.request<UserJob>(`/api/v1/jobs/${jobId}/stage`, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      });
    },
  };

  // Job Stages API
  stages = {
    // GET /api/v1/stages - Get user's stages (system + custom)
    getAll: async (): Promise<ApiResponse<JobStage[]>> => {
      return this.request<JobStage[]>('/api/v1/stages');
    },

    // POST /api/v1/stages - Create custom stage
    create: async (stage: Omit<JobStage, 'id' | 'userId' | 'createdAt' | 'isSystem'>): Promise<ApiResponse<JobStage>> => {
      return this.request<JobStage>('/api/v1/stages', {
        method: 'POST',
        body: JSON.stringify({ ...stage, isSystem: false }),
      });
    },

    // PUT /api/v1/stages/:id - Update custom stage
    update: async (id: number, updates: Partial<JobStage>): Promise<ApiResponse<JobStage>> => {
      return this.request<JobStage>(`/api/v1/stages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    // DELETE /api/v1/stages/:id - Delete custom stage
    delete: async (id: number): Promise<ApiResponse<void>> => {
      return this.request<void>(`/api/v1/stages/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // Auth API
  auth = {
    // GET /api/v1/auth/me - Get current user
    me: async (): Promise<ApiResponse<User>> => {
      return this.request<User>('/api/v1/auth/me');
    },
  };

  // Career Insights API
  insights = {
    // GET /api/v1/insights/career - Get career development insights
    getCareerInsights: async (): Promise<ApiResponse<any>> => {
      return this.request('/api/v1/insights/career');
    },

    // GET /api/v1/insights/tech-trends - Get technology trend analysis
    getTechTrends: async (): Promise<ApiResponse<any>> => {
      return this.request('/api/v1/insights/tech-trends');
    },
  };
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Also export the class for custom instances
export { ApiClient };

// Types are already exported above with the interface declarations