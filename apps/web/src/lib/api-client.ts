// Simple API client with basic types for initial implementation

// Basic types for initial implementation
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  description: string;
  requirements: string[];
  applyUrl: string;
  salary: string | null;
  postedDate: string;
  source: string;
  relevanceScore: number;
  emailMessageId: string;
  processed: boolean;
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  googleId: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobStage {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
  userId?: number;
  createdAt: string;
}

export interface UserJob {
  id: number;
  userId: number;
  jobId: string;
  stageId: number;
  notes?: string;
  appliedDate?: string;
  interviewDate?: string;
  applicationUrl?: string;
  contactPerson?: string;
  salaryExpectation?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface JobFilters {
  search?: string;
  company?: string;
  location?: string;
  remote?: boolean;
  minRelevanceScore?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3333';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
        data,
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
    // GET /api/jobs - Get all jobs with optional filters
    getAll: async (filters?: JobFilters): Promise<PaginatedResponse<Job>> => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.company) params.append('company', filters.company);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.remote !== undefined) params.append('remote', String(filters.remote));
      if (filters?.minRelevanceScore) params.append('minRelevanceScore', String(filters.minRelevanceScore));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const queryString = params.toString();
      const endpoint = `/api/jobs${queryString ? `?${queryString}` : ''}`;
      
      const result = await this.request<{ jobs: Job[]; meta: any }>(endpoint);
      
      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.jobs,
          meta: result.data.meta,
        };
      }
      
      return {
        success: false,
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    },

    // GET /api/jobs/:id - Get specific job
    getById: async (id: string): Promise<ApiResponse<Job>> => {
      return this.request<Job>(`/api/jobs/${id}`);
    },

    // POST /api/jobs/:id/track - Track a job
    track: async (id: string): Promise<ApiResponse<UserJob>> => {
      return this.request<UserJob>(`/api/jobs/${id}/track`, {
        method: 'POST',
      });
    },

    // DELETE /api/jobs/:id/track - Untrack a job
    untrack: async (id: string): Promise<ApiResponse<void>> => {
      return this.request<void>(`/api/jobs/${id}/track`, {
        method: 'DELETE',
      });
    },
  };

  // User Jobs API
  userJobs = {
    // GET /api/user-jobs - Get user's tracked jobs
    getAll: async (): Promise<ApiResponse<UserJob[]>> => {
      return this.request<UserJob[]>('/api/user-jobs');
    },

    // PUT /api/user-jobs/:id/stage - Update job stage
    updateStage: async (id: number, stageId: number): Promise<ApiResponse<UserJob>> => {
      return this.request<UserJob>(`/api/user-jobs/${id}/stage`, {
        method: 'PUT',
        body: JSON.stringify({ stageId }),
      });
    },

    // PUT /api/user-jobs/:id/notes - Update job notes
    updateNotes: async (id: number, notes: string): Promise<ApiResponse<UserJob>> => {
      return this.request<UserJob>(`/api/user-jobs/${id}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      });
    },
  };

  // Job Stages API
  stages = {
    // GET /api/stages - Get user's stages (system + custom)
    getAll: async (): Promise<ApiResponse<JobStage[]>> => {
      return this.request<JobStage[]>('/api/stages');
    },

    // POST /api/stages - Create custom stage
    create: async (stage: Omit<JobStage, 'id' | 'userId' | 'createdAt' | 'isSystem'>): Promise<ApiResponse<JobStage>> => {
      return this.request<JobStage>('/api/stages', {
        method: 'POST',
        body: JSON.stringify({ ...stage, isSystem: false }),
      });
    },

    // PUT /api/stages/:id - Update custom stage
    update: async (id: number, updates: Partial<JobStage>): Promise<ApiResponse<JobStage>> => {
      return this.request<JobStage>(`/api/stages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    // DELETE /api/stages/:id - Delete custom stage
    delete: async (id: number): Promise<ApiResponse<void>> => {
      return this.request<void>(`/api/stages/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // Auth API
  auth = {
    // GET /api/auth/me - Get current user
    me: async (): Promise<ApiResponse<User>> => {
      return this.request<User>('/api/auth/me');
    },
  };
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Also export the class for custom instances
export { ApiClient };

// Types are already exported above with the interface declarations