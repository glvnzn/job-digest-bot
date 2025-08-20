import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '../client';

export function useCareerInsights() {
  const { data: session, status } = useSession();
  
  // Only enable queries if user is authenticated and has token
  const isReady = !!(session?.user && (session as any)?.apiToken && status === 'authenticated');
  
  // Fetch career insights with React Query
  const careerQuery = useQuery({
    queryKey: ['career-insights'],
    queryFn: () => apiClient.insights.getCareerInsights(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isReady,
  });

  const trendsQuery = useQuery({
    queryKey: ['tech-trends'],
    queryFn: () => apiClient.insights.getTechTrends(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isReady,
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
    refetch: () => {
      careerQuery.refetch();
      trendsQuery.refetch();
    },
  };
}