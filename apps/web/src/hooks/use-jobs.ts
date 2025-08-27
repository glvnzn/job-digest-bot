'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient, type Job, type JobFilters, type UserJob } from '@libs/api';

// Get all jobs with filters - fully typed
export function useJobs(filters?: JobFilters) {
  const { data: session, status } = useSession();
  
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => apiClient.jobs.getAll(filters),
    enabled: !!(session?.user && status === 'authenticated'), // Wait for authentication
    staleTime: 5 * 60 * 1000, // 5 minutes - jobs don't change frequently
    retry: 1,
  });
}

// Get specific job by ID - fully typed
export function useJob(id: string) {
  const { data: session, status } = useSession();
  
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => apiClient.jobs.getById(id),
    enabled: !!(id && session?.user && status === 'authenticated'), // Wait for authentication and valid ID
    staleTime: 10 * 60 * 1000, // 10 minutes - individual jobs are stable
  });
}

// Track/untrack jobs - fully typed with optimistic updates
export function useJobTracker() {
  const queryClient = useQueryClient();

  const trackMutation = useMutation({
    mutationFn: (jobId: string) => apiClient.jobs.track(jobId),
    onMutate: async (jobId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-jobs'] });
      await queryClient.cancelQueries({ queryKey: ['jobs'] });

      // Snapshot the previous value
      const previousUserJobs = queryClient.getQueryData(['user-jobs']);

      // Optimistically update the cache
      queryClient.setQueryData(['user-jobs'], (old: any) => {
        if (!old?.success || !old?.data) return old;
        
        // Add the job as tracked (we don't have full UserJob data yet)
        const newUserJob = {
          jobId,
          userId: 1, // Will be set properly by the server
          stageId: 1, // Default to "Interested"
          isTracked: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return {
          ...old,
          data: [...old.data, newUserJob],
        };
      });

      return { previousUserJobs };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousUserJobs) {
        queryClient.setQueryData(['user-jobs'], context.previousUserJobs);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const untrackMutation = useMutation({
    mutationFn: (jobId: string) => apiClient.jobs.untrack(jobId),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: ['user-jobs'] });
      
      const previousUserJobs = queryClient.getQueryData(['user-jobs']);

      // Optimistically remove the job
      queryClient.setQueryData(['user-jobs'], (old: any) => {
        if (!old?.success || !old?.data) return old;
        
        return {
          ...old,
          data: old.data.filter((userJob: UserJob) => userJob.jobId !== jobId),
        };
      });

      return { previousUserJobs };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousUserJobs) {
        queryClient.setQueryData(['user-jobs'], context.previousUserJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const markAppliedMutation = useMutation({
    mutationFn: async (jobId: string) => {
      // Check if job is already tracked
      const isTracked = await isJobTracked(jobId);
      
      // Only track if not already tracked
      if (!isTracked) {
        await apiClient.jobs.track(jobId);
      }
      
      const appliedStageId = await getStageIdByName('Applied');
      return apiClient.userJobs.updateStage(jobId, appliedStageId);
    },
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: ['user-jobs'] });
      
      const previousUserJobs = queryClient.getQueryData(['user-jobs']);

      // Optimistically update or add the job as Applied
      queryClient.setQueryData(['user-jobs'], (old: any) => {
        if (!old?.success || !old?.data) return old;
        
        const existingJob = old.data.find((userJob: UserJob) => userJob.jobId === jobId);
        
        if (existingJob) {
          // Update existing job to Applied stage
          return {
            ...old,
            data: old.data.map((userJob: UserJob) => 
              userJob.jobId === jobId 
                ? { ...userJob, stageId: 2, isTracked: true } // Assuming Applied is stage 2
                : userJob
            ),
          };
        } else {
          // Add new tracked job in Applied stage
          const newUserJob = {
            jobId,
            userId: 1,
            stageId: 2, // Applied stage
            isTracked: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          return {
            ...old,
            data: [...old.data, newUserJob],
          };
        }
      });

      return { previousUserJobs };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousUserJobs) {
        queryClient.setQueryData(['user-jobs'], context.previousUserJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const markNotInterestedMutation = useMutation({
    mutationFn: async (jobId: string) => {
      // Check if job is already tracked
      const isTracked = await isJobTracked(jobId);
      
      // Only track if not already tracked
      if (!isTracked) {
        await apiClient.jobs.track(jobId);
      }
      
      const notInterestedStageId = await getStageIdByName('Not Interested');
      return apiClient.userJobs.updateStage(jobId, notInterestedStageId);
    },
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: ['user-jobs'] });
      
      const previousUserJobs = queryClient.getQueryData(['user-jobs']);

      // Optimistically update or add the job as Not Interested
      queryClient.setQueryData(['user-jobs'], (old: any) => {
        if (!old?.success || !old?.data) return old;
        
        const existingJob = old.data.find((userJob: UserJob) => userJob.jobId === jobId);
        
        if (existingJob) {
          // Update existing job to Not Interested stage
          return {
            ...old,
            data: old.data.map((userJob: UserJob) => 
              userJob.jobId === jobId 
                ? { ...userJob, stageId: 5, isTracked: true } // Assuming Not Interested is stage 5
                : userJob
            ),
          };
        } else {
          // Add new tracked job in Not Interested stage
          const newUserJob = {
            jobId,
            userId: 1,
            stageId: 5, // Not Interested stage
            isTracked: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          return {
            ...old,
            data: [...old.data, newUserJob],
          };
        }
      });

      return { previousUserJobs };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousUserJobs) {
        queryClient.setQueryData(['user-jobs'], context.previousUserJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  // Helper function to check if a job is already tracked
  async function isJobTracked(jobId: string): Promise<boolean> {
    try {
      // First check the cache
      const cachedUserJobs = queryClient.getQueryData(['user-jobs']) as any;
      if (cachedUserJobs?.success && cachedUserJobs?.data) {
        const isInCache = cachedUserJobs.data.some((userJob: UserJob) => 
          userJob.jobId === jobId && userJob.isTracked
        );
        if (isInCache) {
          return true;
        }
      }
      
      // If not in cache or cache is stale, fetch from API
      const userJobsResponse = await apiClient.userJobs.getAll();
      if (userJobsResponse.success && userJobsResponse.data) {
        return userJobsResponse.data.some((userJob: UserJob) => 
          userJob.jobId === jobId && userJob.isTracked
        );
      }
      
      return false;
    } catch (error) {
      console.warn(`Failed to check if job is tracked:`, error);
      return false; // Assume not tracked if we can't check
    }
  }

  // Helper function to get stage ID by name
  async function getStageIdByName(stageName: string): Promise<string> {
    try {
      const stagesResponse = await apiClient.stages.getAll();
      if (stagesResponse.success && stagesResponse.data) {
        const stage = stagesResponse.data.find(s => s.name === stageName);
        if (stage) {
          return stage.id.toString();
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch stages, using fallback for ${stageName}:`, error);
    }
    
    // Fallback: return '1' for Interested (most common default)
    return '1';
  }

  return {
    track: trackMutation.mutate,
    untrack: untrackMutation.mutate,
    markApplied: markAppliedMutation.mutate,
    markNotInterested: markNotInterestedMutation.mutate,
    isTracking: trackMutation.isPending,
    isUntracking: untrackMutation.isPending,
    isMarkingApplied: markAppliedMutation.isPending,
    isMarkingNotInterested: markNotInterestedMutation.isPending,
    trackError: trackMutation.error,
    untrackError: untrackMutation.error,
    markAppliedError: markAppliedMutation.error,
    markNotInterestedError: markNotInterestedMutation.error,
  };
}