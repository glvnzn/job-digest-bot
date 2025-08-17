'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  Star,
  X,
  Loader2,
  Clock,
  Briefcase,
  FileText,
  Edit3,
  Save,
  ChevronRight
} from 'lucide-react';
import { apiClient, type Job, type UserJob, type JobStage } from '@/lib/api-client';

interface JobDetailsDrawerProps {
  jobId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJobUpdate?: () => void; // Callback to refresh parent data
}

export function JobDetailsDrawer({ jobId, isOpen, onOpenChange, onJobUpdate }: JobDetailsDrawerProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [userJob, setUserJob] = useState<UserJob | null>(null);
  const [stages, setStages] = useState<JobStage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    if (isOpen && jobId) {
      fetchJobDetails();
    }
  }, [isOpen, jobId]);

  const fetchJobDetails = async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [jobResult, userJobsResult, stagesResult] = await Promise.all([
        apiClient.jobs.getById(jobId),
        apiClient.userJobs.getAll(),
        apiClient.stages.getAll()
      ]);

      if (jobResult.success && jobResult.data) {
        setJob(jobResult.data);
      } else {
        setError('Failed to fetch job details');
        return;
      }

      if (stagesResult.success) {
        setStages(stagesResult.data || []);
      }

      if (userJobsResult.success) {
        const foundUserJob = userJobsResult.data?.find(uj => uj.jobId === jobId);
        setUserJob(foundUserJob || null);
        setNotes(foundUserJob?.notes || '');
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError('Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackJob = async () => {
    if (!job || isTracking) return;

    try {
      setIsTracking(true);
      const result = await apiClient.jobs.track(job.id);
      
      if (result.success) {
        await fetchJobDetails(); // Refresh data
        onJobUpdate?.(); // Notify parent to refresh
      }
    } catch (err) {
      console.error('Error tracking job:', err);
    } finally {
      setIsTracking(false);
    }
  };

  const handleUntrackJob = async () => {
    if (!job || isTracking) return;

    try {
      setIsTracking(true);
      const result = await apiClient.jobs.untrack(job.id);
      
      if (result.success) {
        setUserJob(null);
        setNotes('');
        onJobUpdate?.(); // Notify parent to refresh
      }
    } catch (err) {
      console.error('Error untracking job:', err);
    } finally {
      setIsTracking(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!job || !userJob) return;

    try {
      setIsSavingNotes(true);
      const result = await apiClient.userJobs.updateNotes(job.id, notes);
      
      if (result.success) {
        setUserJob({ ...userJob, notes });
        setIsEditingNotes(false);
        onJobUpdate?.(); // Notify parent to refresh
      }
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const getCurrentStage = () => {
    if (!userJob || !stages.length) return null;
    return stages.find(stage => stage.id === userJob.stageId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4 pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <SheetTitle className="text-xl font-bold leading-tight">
                {isLoading ? 'Loading...' : job?.title || 'Job Details'}
              </SheetTitle>
              {job && (
                <SheetDescription className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{job.company}</span>
                  {job.location && (
                    <>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <MapPin className="h-3 w-3" />
                      <span>{job.location}</span>
                    </>
                  )}
                </SheetDescription>
              )}
            </div>
          </div>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading job details...
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-destructive mb-4">{error}</div>
            <Button onClick={fetchJobDetails} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {job && !isLoading && (
          <div className="space-y-6">
            {/* Key Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Job Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Match Score</Label>
                    <div className="mt-1">
                      <Badge variant={job.relevanceBadgeVariant || "secondary"} className="text-sm">
                        {job.relevancePercentage}% match
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Posted</Label>
                    <div className="mt-1 flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {job.formattedCreatedAt}
                    </div>
                  </div>
                </div>

                {job.salary && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Salary</Label>
                    <div className="mt-1 text-sm font-medium text-green-700 dark:text-green-400">
                      {job.salary}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {job.isRemote && (
                    <Badge variant="outline">Remote</Badge>
                  )}
                  <Badge variant="secondary">{job.source}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Tracking Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userJob ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Current Stage</Label>
                        <div className="mt-1 flex items-center gap-2">
                          {getCurrentStage() && (
                            <>
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: getCurrentStage()?.color }}
                              />
                              <span className="font-medium">{getCurrentStage()?.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleUntrackJob}
                        disabled={isTracking}
                      >
                        {isTracking ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <X className="h-3 w-3 mr-1" />
                        )}
                        Untrack
                      </Button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                        {!isEditingNotes && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEditingNotes(true)}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                      
                      {isEditingNotes ? (
                        <div className="space-y-2">
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add your notes about this job..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={handleSaveNotes}
                              disabled={isSavingNotes}
                            >
                              {isSavingNotes ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Save className="h-3 w-3 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setIsEditingNotes(false);
                                setNotes(userJob.notes || '');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md min-h-[60px]">
                          {userJob.notes || 'No notes added yet'}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Tracked on {formatDate(userJob.createdAt)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">This job is not being tracked</p>
                    <Button onClick={handleTrackJob} disabled={isTracking}>
                      {isTracking ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Star className="h-4 w-4 mr-2" />
                      )}
                      Track This Job
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Description */}
            {job.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button asChild className="flex-1">
                <a 
                  href={job.applyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply Now
                </a>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}