'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type Job, type JobFilters, type UserJob } from '@libs/api';

// Get all jobs with filters - fully typed
export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => apiClient.jobs.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes - jobs don't change frequently
    retry: 1,
  });
}

// Get specific job by ID - fully typed
export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => apiClient.jobs.getById(id),
    enabled: !!id,
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
    onError: (err, variables, context) => {
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
    onError: (err, variables, context) => {
      if (context?.previousUserJobs) {
        queryClient.setQueryData(['user-jobs'], context.previousUserJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  return {
    track: trackMutation.mutate,
    untrack: untrackMutation.mutate,
    isTracking: trackMutation.isPending,
    isUntracking: untrackMutation.isPending,
    trackError: trackMutation.error,
    untrackError: untrackMutation.error,
  };
}