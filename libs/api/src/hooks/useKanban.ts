import { useQuery } from '@tanstack/react-query';
import { apiClient, type UserJob, type Job, type JobStage } from '@/lib/api-client';
import { useEffect, useState } from 'react';

export interface KanbanData {
  stage: JobStage;
  userJobs: (UserJob & { job: Job })[];
}

export function useKanbanData(enabled = true) {
  const [kanbanData, setKanbanData] = useState<KanbanData[]>([]);

  // Fetch kanban data with React Query
  const userJobsQuery = useQuery({
    queryKey: ['kanban-userJobs'],
    queryFn: () => apiClient.userJobs.getAll(),
    enabled,
  });

  const jobsQuery = useQuery({
    queryKey: ['kanban-jobs', { limit: 1000 }],
    queryFn: () => apiClient.jobs.getAll({ limit: 1000 }),
    enabled,
  });

  const stagesQuery = useQuery({
    queryKey: ['kanban-stages'],
    queryFn: () => apiClient.stages.getAll(),
    enabled,
  });

  const isLoading = userJobsQuery.isLoading || jobsQuery.isLoading || stagesQuery.isLoading;
  const error = userJobsQuery.error || jobsQuery.error || stagesQuery.error;

  // Update kanban data when queries change
  useEffect(() => {
    if (userJobsQuery.data?.success && jobsQuery.data?.success && stagesQuery.data?.success) {
      const userJobs = userJobsQuery.data.data || [];
      const jobs = jobsQuery.data.data || [];
      const stages = (stagesQuery.data.data || []).sort((a, b) => a.sortOrder - b.sortOrder);

      // Create kanban structure
      const kanban: KanbanData[] = stages.map(stage => ({
        stage,
        userJobs: userJobs
          .filter(uj => uj.stageId === stage.id)
          .map(uj => ({
            ...uj,
            job: jobs.find(job => job.id === uj.jobId)!
          }))
          .filter(uj => uj.job) // Filter out jobs that weren't found
      }));

      setKanbanData(kanban);
    }
  }, [userJobsQuery.data, jobsQuery.data, stagesQuery.data]);

  return {
    kanbanData,
    setKanbanData,
    isLoading,
    error,
    userJobsQuery,
    jobsQuery,
    stagesQuery,
  };
}