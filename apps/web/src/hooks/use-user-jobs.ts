'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient, type UserJob, type JobStage } from '@libs/api';

// Get user's tracked jobs (kanban board data) - React Query powered
export function useUserJobs() {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: ['user-jobs', session?.user?.email],
    queryFn: () => apiClient.userJobs.getAll(),
    enabled: !!(session?.user && status === 'authenticated'), // Wait for authentication
    staleTime: 1 * 60 * 1000, // 1 minute - user jobs change more frequently
    retry: 1,
  });
}

// Update job stage with optimistic updates - React Query mutations
export function useJobStageUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, stageId }: { jobId: string; stageId: string }) =>
      apiClient.userJobs.updateStage(jobId, stageId),
    onMutate: async ({ jobId, stageId }) => {
      // Cancel outgoing refetches (React Query feature)
      await queryClient.cancelQueries({ queryKey: ['user-jobs'] });

      // Snapshot the previous value
      const previousUserJobs = queryClient.getQueryData(['user-jobs']);

      // Optimistically update the cache (React Query cache manipulation)
      queryClient.setQueryData(['user-jobs'], (old: any) => {
        if (!old?.success || !old?.data) return old;

        return {
          ...old,
          data: old.data.map((userJob: UserJob) =>
            userJob.jobId === jobId 
              ? { ...userJob, stageId: parseInt(stageId), updatedAt: new Date().toISOString() }
              : userJob
          ),
        };
      });

      return { previousUserJobs };
    },
    onError: (_err, _variables, context) => {
      // Rollback optimistic update on error (React Query error handling)
      if (context?.previousUserJobs) {
        queryClient.setQueryData(['user-jobs'], context.previousUserJobs);
      }
    },
    onSuccess: (_data, _variables) => {
      // Optional: show success toast
      console.log('✅ Job stage updated successfully');
    },
    onSettled: () => {
      // Always refetch after error or success (React Query invalidation)
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] }); // In case it affects job display
    },
  });
}

// Update job notes - React Query mutation
export function useJobNotesUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, notes }: { jobId: string; notes: string }) =>
      apiClient.userJobs.updateNotes(jobId, notes),
    onMutate: async ({ jobId, notes }) => {
      await queryClient.cancelQueries({ queryKey: ['user-jobs'] });
      
      const previousUserJobs = queryClient.getQueryData(['user-jobs']);

      // Optimistic update
      queryClient.setQueryData(['user-jobs'], (old: any) => {
        if (!old?.success || !old?.data) return old;

        return {
          ...old,
          data: old.data.map((userJob: UserJob) =>
            userJob.jobId === jobId 
              ? { ...userJob, notes, updatedAt: new Date().toISOString() }
              : userJob
          ),
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
    },
  });
}

// Group user jobs by stage for kanban board - React Query derived data
export function useKanbanBoard() {
  const { data: userJobsResponse, isLoading: userJobsLoading } = useUserJobs();
  const { data: stagesResponse, isLoading: stagesLoading } = useJobStages();

  const isLoading = userJobsLoading || stagesLoading;
  
  if (isLoading || !userJobsResponse?.success || !stagesResponse?.success) {
    return { kanbanData: [], isLoading };
  }

  const userJobs = userJobsResponse.data || [];
  const stages = stagesResponse.data || [];

  // Group jobs by stage for kanban display
  const kanbanData = stages.map((stage: any) => ({
    stage,
    jobs: userJobs.filter((userJob: any) => userJob.stageId === stage.id),
  }));

  return { kanbanData, isLoading: false };
}

// Get job stages (system + user custom)
export function useJobStages() {
  const { data: session, status } = useSession();
  
  return useQuery({
    queryKey: ['job-stages', session?.user?.email],
    queryFn: () => apiClient.stages.getAll(),
    enabled: !!(session?.user && status === 'authenticated'), // Wait for authentication
    staleTime: 10 * 60 * 1000, // 10 minutes - stages don't change often
  });
}