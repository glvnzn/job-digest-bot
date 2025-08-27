import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function useDashboardData(enabled = true) {
  // Fetch dashboard stats using the dedicated API endpoint
  const dashboardStatsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.dashboard.getStats(),
    enabled,
  });

  // Still fetch individual data for widgets that need detailed job information
  const jobsQuery = useQuery({
    queryKey: ['dashboard-jobs', { limit: 10000 }], // Increased limit for better data coverage
    queryFn: () => apiClient.jobs.getAll({ limit: 10000 }),
    enabled,
  });

  const userJobsQuery = useQuery({
    queryKey: ['dashboard-userJobs'],
    queryFn: () => apiClient.userJobs.getAll({ limit: 1000 }), // Add higher limit for user jobs
    enabled,
  });

  const stagesQuery = useQuery({
    queryKey: ['dashboard-stages'],
    queryFn: () => apiClient.stages.getAll(),
    enabled,
  });

  const isLoading = dashboardStatsQuery.isLoading || jobsQuery.isLoading || userJobsQuery.isLoading || stagesQuery.isLoading;
  const error = dashboardStatsQuery.error || jobsQuery.error || userJobsQuery.error || stagesQuery.error;

  // Use the optimized stats from the dashboard API
  const stats = (() => {
    if (!dashboardStatsQuery.data?.success || !dashboardStatsQuery.data.data) {
      return null;
    }

    const apiStats = dashboardStatsQuery.data.data;
    
    // Transform API response to match existing interface
    return {
      overview: {
        totalJobsAvailable: apiStats.overview.totalJobsAvailable,
        totalSavedJobs: apiStats.overview.totalSavedJobs,
        averageRelevanceScore: apiStats.overview.averageRelevanceScore
      },
      activity: {
        thisWeek: {
          saved: apiStats.activity.thisWeek.saved,
          growth: apiStats.activity.thisWeek.growth
        },
        thisMonth: {
          saved: apiStats.activity.thisMonth.saved,
          growth: apiStats.activity.thisMonth.growth
        }
      },
      jobsByStage: apiStats.pipeline.stages.map(stageData => ({
        stage: stageData.stage,
        count: stageData.count
      })),
      topCompanies: apiStats.topCompanies,
      recentActivity: apiStats.recentActivity
    };
  })();

  return {
    stats,
    isLoading,
    error,
    refetch: () => {
      dashboardStatsQuery.refetch();
      jobsQuery.refetch();
      userJobsQuery.refetch();
      stagesQuery.refetch();
    },
    jobsQuery,
    userJobsQuery,
    stagesQuery,
  };
}