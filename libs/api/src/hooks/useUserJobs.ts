import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';

export function useUserJobs(enabled = true) {
  return useQuery({
    queryKey: ['userJobs'],
    queryFn: () => apiClient.userJobs.getAll(),
    enabled,
  });
}

export function useUpdateJobStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, stageId }: { jobId: string; stageId: string }) => 
      apiClient.userJobs.updateStage(jobId, stageId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['userJobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}