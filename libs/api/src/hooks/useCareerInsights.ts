import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function useCareerInsights(enabled = true) {
  // Fetch career insights with React Query
  const careerQuery = useQuery({
    queryKey: ['career-insights'],
    queryFn: () => apiClient.insights.getCareerInsights(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });

  const trendsQuery = useQuery({
    queryKey: ['tech-trends'],
    queryFn: () => apiClient.insights.getTechTrends(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });

  const isLoading = careerQuery.isLoading || trendsQuery.isLoading;
  const error = careerQuery.error || trendsQuery.error;
  const insights = careerQuery.data?.success ? careerQuery.data.data : null;
  const techTrends = trendsQuery.data?.success ? trendsQuery.data.data : null;

  return {
    insights,
    techTrends,
    isLoading,
    error,
    careerQuery,
    trendsQuery,
  };
}