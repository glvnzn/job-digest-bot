import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useStages(enabled = true) {
  return useQuery({
    queryKey: ['stages'],
    queryFn: () => apiClient.stages.getAll(),
    enabled,
  });
}