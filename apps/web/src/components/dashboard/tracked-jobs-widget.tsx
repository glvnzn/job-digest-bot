'use client';

import { useState, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { JobDetailsDrawer } from '@/components/job-details-drawer';
import { useJobTracker } from '@/hooks/use-jobs';
import { 
  Star, 
  ArrowRight, 
  RefreshCw, 
  Eye, 
  ExternalLink, 
  X, 
  Loader2, 
  Building2, 
  MapPin,
  Search,
  Filter
} from 'lucide-react';
import { TrackedJobsListProps } from './types';

const TrackedJobsWidget = memo(function TrackedJobsWidget({ 
  userJobs, 
  jobs, 
  stages, 
  isLoading, 
  onUpdate 
}: TrackedJobsListProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);
  const { untrack, isUntracking } = useJobTracker();

  const handleUntrackJob = async (jobId: string) => {
    untrack(jobId, {
      onSuccess: onUpdate,
      onError: (error) => console.error('Error untracking job:', error)
    });
  };

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsDrawerOpen(true);
  };

  // Filter jobs based on search and stage
  const filteredUserJobs = userJobs.filter(userJob => {
    const job = jobs.find(j => j.id === userJob.jobId);
    if (!job) return false;

    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = selectedStage === 'all' || userJob.stageId?.toString() === selectedStage;

    return matchesSearch && matchesStage;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Tracked Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading tracked jobs...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userJobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Tracked Jobs</CardTitle>
          <CardDescription>Start building your job application pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No tracked jobs yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Discover and track jobs that match your career goals
            </p>
            <Button asChild>
              <Link href="/jobs">
                Browse Jobs
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Your Tracked Jobs</CardTitle>
            <CardDescription>
              {filteredUserJobs.length} of {userJobs.length} jobs
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/kanban">
                Kanban View
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/jobs">
                Browse More
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Stages</option>
            {stages.map(stage => (
              <option key={stage.id} value={stage.id?.toString()}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {(showAll ? filteredUserJobs : filteredUserJobs.slice(0, 10)).map((userJob) => {
            const job = jobs.find(j => j.id === userJob.jobId);
            const stage = stages.find(s => s.id === userJob.stageId);
            
            if (!job) return null;

            return (
              <div key={userJob.id} className="group relative p-4 border rounded-lg bg-card hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0" 
                    style={{ backgroundColor: stage?.color || '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{job.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{job.company}</span>
                      {job.location && (
                        <>
                          <span>•</span>
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{job.location}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: stage?.color, color: stage?.color }}
                      >
                        {stage?.name || 'Unknown'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {job.relevancePercentage}% match
                      </Badge>
                      {job.isRemote && (
                        <Badge variant="secondary" className="text-xs">Remote</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => handleViewJob(job.id)}
                    title="View details"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button 
                    asChild 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    title="Apply"
                  >
                    <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleUntrackJob(job.id)}
                    disabled={isUntracking(job.id)}
                    title="Untrack"
                  >
                    {isUntracking(job.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredUserJobs.length > 10 && (
          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAll(!showAll)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showAll ? (
                <>
                  Show Less
                  <X className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Show More ({filteredUserJobs.length - 10} more jobs)
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}

        {filteredUserJobs.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">
              No jobs found for "{searchQuery}"
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Job Details Drawer */}
      <JobDetailsDrawer
        jobId={selectedJobId}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onJobUpdate={onUpdate}
      />
    </Card>
  );
});

export { TrackedJobsWidget };