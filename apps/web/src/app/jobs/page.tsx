'use client';

import { useEffect, useState } from 'react';

// Force dynamic rendering to avoid build-time env issues
export const dynamic = 'force-dynamic';
import { useSession, signOut } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, Job, JobFilters } from '@/lib/api-client';
import { JobDetailsDrawer } from '@/components/job-details-drawer';
import { Search, ExternalLink, Eye, Star, Building2, MapPin, Briefcase, RefreshCw, Loader2 } from 'lucide-react';

export default function JobsPage() {
  const { data: session, status } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<JobFilters>({ limit: 20 });
  const [totalJobs, setTotalJobs] = useState(0);
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

    if (status === 'authenticated') {
      fetchJobs();
    }
  }, [status, router]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (searchTerm !== filters.search) {
        setFilters(prev => ({ ...prev, search: searchTerm || undefined, offset: 0 }));
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters.search]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchJobs();
      fetchTrackedJobs();
    }
  }, [filters, status]);

  const fetchTrackedJobs = async () => {
    try {
      const result = await apiClient.userJobs.getAll();
      if (result.success && result.data) {
        const trackedJobIds = new Set(result.data.map(userJob => userJob.jobId));
        setTrackedJobs(trackedJobIds);
      }
    } catch (err) {
      console.error('Error fetching tracked jobs:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiClient.jobs.getAll(filters);
      
      if (result.success) {
        setJobs(result.data);
        setTotalJobs(result.meta.total);
      } else {
        const errorMsg = 'Failed to fetch jobs: ' + (result.error || 'Unknown error');
        console.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackJob = async (jobId: string) => {
    // Prevent multiple clicks
    if (trackingJobs.has(jobId)) return;
    
    try {
      setTrackingJobs(prev => new Set(prev).add(jobId));
      
      const result = await apiClient.jobs.track(jobId);
      if (result.success) {
        setTrackedJobs(prev => new Set(prev).add(jobId));
        // You could add a toast notification here
        console.log('✅ Job tracked successfully');
      } else {
        console.error('❌ Failed to track job:', result.error);
        // You could show an error toast here
      }
    } catch (err) {
      console.error('❌ Error tracking job:', err);
    } finally {
      setTrackingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleUntrackJob = async (jobId: string) => {
    if (trackingJobs.has(jobId)) return;
    
    try {
      setTrackingJobs(prev => new Set(prev).add(jobId));
      
      const result = await apiClient.jobs.untrack(jobId);
      if (result.success) {
        setTrackedJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        console.log('✅ Job untracked successfully');
      } else {
        console.error('❌ Failed to untrack job:', result.error);
      }
    } catch (err) {
      console.error('❌ Error untracking job:', err);
    } finally {
      setTrackingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
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
    fetchJobs();
    fetchTrackedJobs();
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
          <div className="text-destructive">{error}</div>
          <Button onClick={fetchJobs}>Try Again</Button>
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
              <Button onClick={fetchJobs} variant="outline" size="sm">
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Button
                variant={filters.remote ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  remote: prev.remote ? undefined : true,
                  offset: 0 
                }))}
              >
                Remote Only
              </Button>
              <Button
                variant={filters.minRelevanceScore ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  minRelevanceScore: prev.minRelevanceScore ? undefined : 0.7,
                  offset: 0 
                }))}
              >
                High Match (70%+)
              </Button>
              <Button
                variant={filters.untracked ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  untracked: !prev.untracked,
                  offset: 0 
                }))}
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
              {searchTerm || filters.remote || filters.minRelevanceScore || filters.untracked
                ? "Try adjusting your search filters to see more results."
                : "There are currently no job opportunities available. Try refreshing or check back later."
              }
            </p>
            <div className="flex gap-2 justify-center">
              {(searchTerm || filters.remote || filters.minRelevanceScore || filters.untracked) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ limit: 20 });
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button onClick={fetchJobs}>
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
              Showing {(filters.offset || 0) + 1} - {Math.min((filters.offset || 0) + jobs.length, totalJobs)} of {totalJobs} jobs
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={!filters.offset || filters.offset === 0}
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  offset: Math.max(0, (prev.offset || 0) - (prev.limit || 20))
                }))}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={(filters.offset || 0) + jobs.length >= totalJobs}
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  offset: (prev.offset || 0) + (prev.limit || 20)
                }))}
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