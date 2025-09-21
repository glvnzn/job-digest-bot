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
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { useJobTracker } from '@/hooks/use-jobs';
import { useJob } from '@/hooks/use-jobs';
import { useUserJobs, useJobStages, useJobNotesUpdate } from '@/hooks/use-user-jobs';

interface JobDetailsDrawerProps {
  jobId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJobUpdate?: () => void; // Callback to refresh parent data
}

export function JobDetailsDrawer({ jobId, isOpen, onOpenChange, onJobUpdate }: JobDetailsDrawerProps) {
  const { track, untrack, isTracking, isUntracking } = useJobTracker();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Use proper hooks for data fetching
  const { data: jobResult, isLoading: jobLoading, error: jobError } = useJob(jobId || '');
  const { data: userJobsResult, isLoading: userJobsLoading } = useUserJobs();
  const { data: stagesResult, isLoading: stagesLoading } = useJobStages();
  const { mutate: updateNotes, isPending: isSavingNotes } = useJobNotesUpdate();

  const isLoading = jobLoading || userJobsLoading || stagesLoading;
  const error = jobError;
  const job = jobResult?.success ? jobResult.data : null;
  const stages = stagesResult?.success ? stagesResult.data || [] : [];
  const userJob = userJobsResult?.success 
    ? userJobsResult.data?.find(uj => uj.jobId === jobId) || null 
    : null;

  // Update notes when userJob changes
  useEffect(() => {
    if (userJob?.notes !== undefined) {
      setNotes(userJob.notes || '');
    }
  }, [userJob]);

  const handleTrackJob = () => {
    if (!job || isTracking(job.id)) return;

    track(job.id, {
      onSuccess: () => {
        // Notify parent to refresh data
        onJobUpdate?.();
      },
      onError: (error: any) => {
        console.error('Error tracking job:', error);
      }
    });
  };

  const handleUntrackJob = () => {
    if (!job || isTracking(job.id) || isUntracking(job.id)) return;

    untrack(job.id, {
      onSuccess: () => {
        // Notify parent to refresh data
        setNotes('');
        onJobUpdate?.();
      },
      onError: (error: any) => {
        console.error('Error untracking job:', error);
      }
    });
  };

  const handleSaveNotes = async () => {
    if (!job || !userJob) return;

    updateNotes(
      { jobId: job.id, notes, stageId: userJob.stageId.toString() },
      {
        onSuccess: () => {
          setIsEditingNotes(false);
          onJobUpdate?.(); // Notify parent to refresh
        },
        onError: (error) => {
          console.error('Error saving notes:', error);
        }
      }
    );
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

  const getExtractionStatusInfo = (job: any) => {
    if (!job.extractionStatus) {
      return {
        icon: Info,
        color: 'text-muted-foreground',
        label: 'Unknown',
        description: 'Content extraction status not available'
      };
    }

    switch (job.extractionStatus) {
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          label: 'Enhanced',
          description: 'Job content was successfully enhanced with additional details'
        };
      case 'partial':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          label: 'Partially Enhanced',
          description: 'Some content was extracted but AI enhancement failed'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          label: 'Extraction Failed',
          description: job.extractionError || 'Failed to extract additional job content'
        };
      case 'skipped':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          label: 'Skipped',
          description: job.extractionError || 'Content extraction was skipped'
        };
      default:
        return {
          icon: Clock,
          color: 'text-blue-600',
          label: 'Pending',
          description: 'Content extraction is pending'
        };
    }
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
            <div className="text-destructive mb-4">{error?.message || 'Failed to load job details'}</div>
            <Button onClick={() => {
              onJobUpdate?.(); // Let parent handle refresh
            }} variant="outline">
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

            {/* Content Extraction Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const statusInfo = getExtractionStatusInfo(job);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Extraction Status</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                            <span className="font-medium">{statusInfo.label}</span>
                          </div>
                        </div>
                        {job.extractionAttempts && (
                          <div className="text-right">
                            <Label className="text-sm font-medium text-muted-foreground">Attempts</Label>
                            <div className="mt-1 text-sm">{job.extractionAttempts}</div>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm text-muted-foreground">
                          {statusInfo.description}
                        </p>

                        {job.lastExtractionAt && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Last attempt: {formatDate(job.lastExtractionAt)}
                          </div>
                        )}
                      </div>

                      {job.extractionStatus === 'failed' && job.applyUrl && (
                        <div className="flex items-start gap-2 p-3 border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 rounded-md">
                          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-orange-800 dark:text-orange-200">
                              Limited job details available
                            </p>
                            <p className="text-orange-700 dark:text-orange-300 mt-1">
                              We couldn't extract the full job description from the posting.
                              For complete details, please visit the job page directly.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                        disabled={isTracking(job.id) || isUntracking(job.id)}
                      >
                        {(isTracking(job.id) || isUntracking(job.id)) ? (
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
                    <Button onClick={handleTrackJob} disabled={isTracking(job.id)}>
                      {isTracking(job.id) ? (
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