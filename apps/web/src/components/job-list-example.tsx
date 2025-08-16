'use client'

import { Button } from '@/components/ui/button'
import { useJobs, useJobTracker } from '@/hooks/use-jobs'
import { useUserJobs } from '@/hooks/use-user-jobs'
import type { Job } from '@/lib/api-client'

/**
 * Example component showing how OpenAPI + React Query integration works
 * This demonstrates:
 * 1. Fully typed API responses
 * 2. React Query caching and loading states
 * 3. Optimistic updates for mutations
 * 4. Error handling
 */
export function JobListExample() {
  // 🔥 Fully typed React Query hook
  const { 
    data: jobsResponse, 
    isLoading: jobsLoading, 
    error: jobsError 
  } = useJobs({ 
    limit: 10, 
    minRelevanceScore: 70 
  });

  // 🔥 User's tracked jobs with React Query
  const { 
    data: userJobsResponse, 
    isLoading: userJobsLoading 
  } = useUserJobs();

  // 🔥 Mutations with optimistic updates
  const { track, untrack, isTracking, isUntracking } = useJobTracker();

  if (jobsLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (jobsError || !jobsResponse?.success) {
    return (
      <div className="p-4 border border-destructive bg-destructive/5 rounded-lg">
        <p className="text-destructive">
          Failed to load jobs: {jobsError?.message || 'Unknown error'}
        </p>
      </div>
    );
  }

  const jobs = jobsResponse.data || [];
  const trackedJobIds = new Set(
    userJobsResponse?.data?.map((uj: any) => uj.jobId) || []
  );

  const handleToggleTracking = (job: Job) => {
    const isTracked = trackedJobIds.has(job.id);
    
    if (isTracked) {
      untrack(job.id);
    } else {
      track(job.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Latest Jobs ({jobs.length})
        </h2>
        {userJobsLoading && (
          <p className="text-sm text-muted-foreground">Loading your tracked jobs...</p>
        )}
      </div>

      <div className="space-y-4">
        {jobs.map((job: Job) => {
          const isTracked = trackedJobIds.has(job.id);
          const isProcessing = isTracking || isUntracking;
          
          return (
            <div 
              key={job.id} 
              className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      (job.relevanceScore || 0) >= 80 
                        ? 'bg-green-100 text-green-800' 
                        : (job.relevanceScore || 0) >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {Math.round((job.relevanceScore || 0) * 100)}% match
                    </span>
                  </div>
                  
                  <p className="text-muted-foreground">
                    {job.company} • {job.location}
                  </p>
                  
                  {job.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Posted: {new Date(job.postedDate || '').toLocaleDateString()}</span>
                    {job.salary && <span>Salary: {job.salary}</span>}
                    {job.isRemote && <span className="text-green-600">Remote</span>}
                  </div>
                </div>

                <div className="ml-4 space-y-2">
                  <Button
                    variant={isTracked ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleTracking(job)}
                    disabled={isProcessing}
                  >
                    {isTracked ? "Untrack" : "Track Job"}
                  </Button>
                  
                  {job.applyUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                        View Job
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No jobs found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}