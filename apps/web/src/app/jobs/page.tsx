'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQueryState, parseAsBoolean, parseAsFloat, parseAsInteger } from 'nuqs';
import { useQueryClient } from '@tanstack/react-query';

// Force dynamic rendering to avoid build-time env issues
export const dynamic = 'force-dynamic';
import { useSession, signOut } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Job, JobFilters } from '@/lib/api-client';
import { useJobs, useJobTracker } from '@/hooks/use-jobs';
import { useUserJobs } from '@/hooks/use-user-jobs';
import { JobDetailsDrawer } from '@/components/job-details-drawer';
import { Search, ExternalLink, Eye, Star, Building2, MapPin, Briefcase, RefreshCw, Loader2 } from 'lucide-react';

export default function JobsPage() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const { track, untrack, isTracking, isUntracking } = useJobTracker();
  // URL-synced filter state using nuqs
  const [search, setSearch] = useQueryState('search', {
    throttleMs: 300 // Debounce search input
  });
  const [remote, setRemote] = useQueryState('remote', parseAsBoolean);
  const [untracked, setUntracked] = useQueryState('untracked', parseAsBoolean);
  const [minRelevanceScore, setMinRelevanceScore] = useQueryState('minRelevanceScore', parseAsFloat);
  const [limit, setLimit] = useQueryState('limit', parseAsInteger.withDefault(20));
  const [offset, setOffset] = useQueryState('offset', parseAsInteger.withDefault(0));
  
  // Build filters object for API calls
  const filters = useMemo((): JobFilters => ({
    search: search || undefined,
    remote: remote || undefined,
    untracked: untracked || undefined,
    minRelevanceScore: minRelevanceScore || undefined,
    limit,
    offset
  }), [search, remote, untracked, minRelevanceScore, limit, offset]);

  // Fetch jobs with React Query
  const { data: jobsData, isLoading, error, refetch } = useJobs(filters);

  const jobs = jobsData?.data || [];
  const totalJobs = jobsData?.meta?.total || 0;
  
  const [trackingJobs, setTrackingJobs] = useState<Set<string>>(new Set());
  const [trackedJobs, setTrackedJobs] = useState<Set<string>>(new Set());
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  // Fetch tracked jobs when authenticated
  const { data: userJobsData } = useUserJobs();

  useEffect(() => {
    if (userJobsData?.success && userJobsData.data) {
      const trackedJobIds = new Set<string>(userJobsData.data.map((userJob: any) => userJob.jobId));
      setTrackedJobs(trackedJobIds);
    }
  }, [userJobsData]);

  const handleTrackJob = (jobId: string) => {
    // Prevent multiple clicks
    if (trackingJobs.has(jobId)) return;
    
    setTrackingJobs(prev => new Set(prev).add(jobId));
    track(jobId, {
      onSuccess: () => {
        setTrackedJobs(prev => new Set(prev).add(jobId));
        console.log('✅ Job tracked successfully');
      },
      onError: (error: any) => {
        console.error('❌ Failed to track job:', error);
      },
      onSettled: () => {
        setTrackingJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }
    });
  };

  const handleUntrackJob = (jobId: string) => {
    if (trackingJobs.has(jobId)) return;
    
    setTrackingJobs(prev => new Set(prev).add(jobId));
    untrack(jobId, {
      onSuccess: () => {
        setTrackedJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        console.log('✅ Job untracked successfully');
      },
      onError: (error: any) => {
        console.error('❌ Failed to untrack job:', error);
      },
      onSettled: () => {
        setTrackingJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }
    });
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsDrawerOpen(true);
  };

  const handleDrawerUpdate = () => {
    // Refresh data when drawer updates something
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['userJobs'] });
  };

  // Note: Calculations moved to backend API - frontend now receives pre-computed values

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-destructive">{error.message || 'An error occurred'}</div>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Job Digest</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="bg-muted">
                <Link href="/jobs">Jobs</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/kanban">Kanban</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/insights">Career Insights</Link>
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {session?.user && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Welcome,</span>
                <span className="font-medium">{session.user.name || session.user.email?.split('@')[0]}</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Available Jobs</h2>
              <p className="text-muted-foreground">
                {totalJobs} total job{totalJobs !== 1 ? 's' : ''} • Showing {jobs.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Refresh
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="bg-muted/30 rounded-lg py-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search jobs by title, company, or keywords..."
                  value={search || ''}
                  onChange={(e) => setSearch(e.target.value || null)}
                  className="pl-10 bg-background"
                />
              </div>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Button
                variant={remote ? "default" : "outline"}
                size="sm"
                onClick={async () => {
                  await setRemote(!remote);
                  await setOffset(0);
                }}
              >
                Remote Only
              </Button>
              <Button
                variant={minRelevanceScore ? "default" : "outline"}
                size="sm"
                onClick={async () => {
                  await setMinRelevanceScore(minRelevanceScore ? null : 0.7);
                  await setOffset(0);
                }}
              >
                High Match (70%+)
              </Button>
              <Button
                variant={untracked ? "default" : "outline"}
                size="sm"
                onClick={async () => {
                  await setUntracked(!untracked);
                  await setOffset(0);
                }}
              >
                Untracked Only
              </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Job List */}
        <div className="space-y-2">
          {jobs.map((job) => (
            <Card key={job.id} className={`hover:shadow-sm transition-all duration-200 border-l-4 ${trackedJobs.has(job.id) ? 'ring-1 ring-primary/20 bg-primary/5' : ''}`} 
                  style={{ borderLeftColor: job.relevancePercentage >= 80 ? '#10b981' : job.relevancePercentage >= 60 ? '#f59e0b' : '#6b7280' }}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Main Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm leading-tight">{job.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3" />
                          <span className="font-medium text-foreground">{job.company}</span>
                          {job.location && (
                            <>
                              <span>•</span>
                              <MapPin className="h-3 w-3" />
                              <span>{job.location}</span>
                            </>
                          )}
                          {job.isRemote && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="text-xs px-2 py-0">Remote</Badge>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Match Score */}
                      <div className="flex flex-col items-end">
                        <Badge 
                          variant={job.relevanceBadgeVariant || "secondary"}
                          className="text-xs font-medium mb-1"
                        >
                          {job.relevancePercentage}%
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {job.formattedCreatedAt}
                        </div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    {job.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {job.description.slice(0, 120)}
                        {job.description.length > 120 ? '...' : ''}
                      </p>
                    )}
                    
                    {/* Bottom Row */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3">
                        {job.salary && (
                          <div className="text-xs font-medium text-green-700 dark:text-green-400">
                            {job.salary}
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <Button 
                          variant={trackedJobs.has(job.id) ? "default" : "ghost"}
                          size="sm"
                          onClick={() => trackedJobs.has(job.id) ? handleUntrackJob(job.id) : handleTrackJob(job.id)}
                          disabled={trackingJobs.has(job.id)}
                          className="h-7 px-2 text-xs"
                          title={trackedJobs.has(job.id) ? "Untrack job" : "Track job"}
                        >
                          {trackingJobs.has(job.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Star className={`h-3 w-3 ${trackedJobs.has(job.id) ? 'fill-current' : ''}`} />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleViewJob(job.id)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {job.applyUrl && (
                          <Button asChild size="sm" className="h-7 px-2 text-xs">
                            <a 
                              href={job.applyUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {jobs.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {search || remote || minRelevanceScore || untracked
                ? "Try adjusting your search filters to see more results."
                : "There are currently no job opportunities available. Try refreshing or check back later."
              }
            </p>
            <div className="flex gap-2 justify-center">
              {(search || remote || minRelevanceScore || untracked) && (
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await setSearch(null);
                    await setRemote(null);
                    await setMinRelevanceScore(null);
                    await setUntracked(null);
                    await setOffset(0);
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Jobs
              </Button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {jobs.length > 0 && (
          <div className="flex items-center justify-between py-4 mt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Showing {(offset || 0) + 1} - {Math.min((offset || 0) + jobs.length, totalJobs)} of {totalJobs} jobs
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={!offset || offset === 0}
                onClick={() => setOffset(Math.max(0, (offset || 0) - (limit || 20)))}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={(offset || 0) + jobs.length >= totalJobs}
                onClick={() => setOffset((offset || 0) + (limit || 20))}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Job Details Drawer */}
        <JobDetailsDrawer
          jobId={selectedJobId}
          isOpen={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          onJobUpdate={handleDrawerUpdate}
        />
      </main>
    </div>
  );
}