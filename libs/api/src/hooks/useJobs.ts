import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient, type JobFilters } from '@/lib/api-client';

export function useJobs(filters: JobFilters, enabled = true) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => apiClient.jobs.getAll(filters),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useJobsInfinite(filters: JobFilters, enabled = true) {
  return useQuery({
    queryKey: ['jobs-infinite', filters],
    queryFn: () => apiClient.jobs.getAll(filters),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useTrackJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (jobId: string) => apiClient.jobs.track(jobId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['userJobs'] });
    },
  });
}

export function useUntrackJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (jobId: string) => apiClient.jobs.untrack(jobId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['userJobs'] });
    },
  });
}