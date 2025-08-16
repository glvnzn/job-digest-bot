'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient, type UserJob, type JobStage } from '@/lib/api-client';

// Get user's tracked jobs (kanban board data) - React Query powered
export function useUserJobs() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['user-jobs', session?.user?.email],
    queryFn: () => apiClient.userJobs.getAll(),
    enabled: !!session?.user, // Only fetch if user is authenticated
    staleTime: 1 * 60 * 1000, // 1 minute - user jobs change more frequently
    retry: 1,
  });
}

// Update job stage with optimistic updates - React Query mutations
export function useJobStageUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userJobId, stageId }: { userJobId: number; stageId: number }) =>
      apiClient.userJobs.updateStage(userJobId, stageId),
    onMutate: async ({ userJobId, stageId }) => {
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
            userJob.id === userJobId 
              ? { ...userJob, stageId, updatedAt: new Date().toISOString() }
              : userJob
          ),
        };
      });

      return { previousUserJobs };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update on error (React Query error handling)
      if (context?.previousUserJobs) {
        queryClient.setQueryData(['user-jobs'], context.previousUserJobs);
      }
    },
    onSuccess: (data, variables) => {
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
    mutationFn: ({ userJobId, notes }: { userJobId: number; notes: string }) =>
      apiClient.userJobs.updateNotes(userJobId, notes),
    onMutate: async ({ userJobId, notes }) => {
      await queryClient.cancelQueries({ queryKey: ['user-jobs'] });
      
      const previousUserJobs = queryClient.getQueryData(['user-jobs']);

      // Optimistic update
      queryClient.setQueryData(['user-jobs'], (old: any) => {
        if (!old?.success || !old?.data) return old;

        return {
          ...old,
          data: old.data.map((userJob: UserJob) =>
            userJob.id === userJobId 
              ? { ...userJob, notes, updatedAt: new Date().toISOString() }
              : userJob
          ),
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
  return useQuery({
    queryKey: ['job-stages'],
    queryFn: () => apiClient.stages.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutes - stages don't change often
  });
}