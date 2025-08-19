import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useDashboardData(enabled = true) {
  // Fetch dashboard data with React Query
  const jobsQuery = useQuery({
    queryKey: ['dashboard-jobs', { limit: 1000 }],
    queryFn: () => apiClient.jobs.getAll({ limit: 1000 }),
    enabled,
  });

  const userJobsQuery = useQuery({
    queryKey: ['dashboard-userJobs'],
    queryFn: () => apiClient.userJobs.getAll(),
    enabled,
  });

  const stagesQuery = useQuery({
    queryKey: ['dashboard-stages'],
    queryFn: () => apiClient.stages.getAll(),
    enabled,
  });

  const isLoading = jobsQuery.isLoading || userJobsQuery.isLoading || stagesQuery.isLoading;
  const error = jobsQuery.error || userJobsQuery.error || stagesQuery.error;

  // Calculate stats from fetched data
  const stats = (() => {
    if (!jobsQuery.data?.success || !userJobsQuery.data?.success || !stagesQuery.data?.success) {
      return null;
    }
    
    const totalJobs = jobsQuery.data.meta?.total || 0;
    const userJobs = userJobsQuery.data.data || [];
    const stages = stagesQuery.data.data || [];

    // Calculate average relevance score of tracked jobs
    const trackedJobIds = userJobs.map(uj => uj.jobId);
    const trackedJobs = jobsQuery.data.data?.filter(job => trackedJobIds.includes(job.id)) || [];
    const avgRelevance = trackedJobs.length > 0 
      ? trackedJobs.reduce((sum, job) => sum + job.relevancePercentage, 0) / trackedJobs.length
      : 0;

    // Group jobs by stage
    const jobsByStage = stages.map(stage => ({
      stage: {
        id: stage.id,
        name: stage.name,
        color: stage.color || '#6B7280'
      },
      count: userJobs.filter(uj => uj.stageId === stage.id).length
    }));

    // Get top companies
    const companyCount: Record<string, number> = {};
    trackedJobs.forEach(job => {
      companyCount[job.company] = (companyCount[job.company] || 0) + 1;
    });
    const topCompanies = Object.entries(companyCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([company, count]) => ({ company, count }));

    // Recent activity (last updated jobs)
    const recentActivity = userJobs
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(userJob => {
        const job = trackedJobs.find(j => j.id === userJob.jobId);
        const stage = stages.find(s => s.id === userJob.stageId);
        return {
          id: userJob.id,
          job: {
            id: userJob.jobId,
            title: job?.title || 'Unknown Job',
            company: job?.company || 'Unknown Company'
          },
          stage: {
            name: stage?.name || 'Unknown',
            color: stage?.color || '#6B7280'
          },
          updatedAt: userJob.updatedAt
        };
      });

    return {
      overview: {
        totalJobsAvailable: totalJobs,
        totalSavedJobs: userJobs.length,
        averageRelevanceScore: avgRelevance
      },
      activity: {
        thisWeek: { saved: userJobs.length, growth: 0 }, // TODO: Calculate actual growth
        thisMonth: { saved: userJobs.length, growth: 0 } // TODO: Calculate actual growth
      },
      jobsByStage,
      topCompanies,
      recentActivity
    };
  })();

  return {
    stats,
    isLoading,
    error,
    jobsQuery,
    userJobsQuery,
    stagesQuery,
  };
}