'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQueryState } from 'nuqs';
import { useSession, signOut } from 'next-auth/react';
import { useUserJobs, useJobStages, useJobStageUpdate } from '@/hooks/use-user-jobs';
import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  MouseSensor,
  TouchSensor,
  useDroppable,
  DragOverEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Briefcase,
  ArrowLeft,
  Building2,
  MapPin,
  ExternalLink,
  Eye,
  RefreshCw,
  GripVertical,
  Search,
  Filter,
  X
} from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { type Job, type UserJob, type JobStage } from '@libs/api';

// Type for UserJob with embedded Job data (as returned by /api/v1/jobs/user/saved)
interface UserJobWithJob extends UserJob {
  job: Job & {
    formattedPostedDate: string;
    formattedCreatedAt: string;
    relevancePercentage: number;
    relevanceBadgeVariant: 'default' | 'secondary';
  };
  stage: {
    id: number;
    name: string;
    color: string;
    isSystem: boolean;
  };
}
import { JobDetailsDrawer } from '@/components/job-details-drawer';

// Force dynamic rendering to avoid build-time env issues

interface KanbanData {
  stage: JobStage;
  userJobs: UserJobWithJob[];
}

// Draggable job card component - memoized for performance
const DraggableJobCard = React.memo(function DraggableJobCard({ 
  userJob, 
  onViewJob 
}: { 
  userJob: UserJobWithJob; 
  onViewJob: (jobId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: userJob.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { job } = userJob;

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`cursor-grab active:cursor-grabbing ${
        isSortableDragging ? 'opacity-0' : 'hover:shadow-md'
      }`}
      {...attributes}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with drag handle */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div {...listeners} className="cursor-grab p-1 -m-1 text-muted-foreground hover:text-foreground mt-0.5">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm leading-tight line-clamp-2">{job.title}</h4>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs shrink-0">
              {job.relevancePercentage}%
            </Badge>
          </div>

          {/* Company and location */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="font-medium text-foreground truncate">{job.company}</span>
            </div>
            {job.location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{job.location}</span>
                {job.isRemote && (
                  <Badge variant="outline" className="text-xs ml-auto">Remote</Badge>
                )}
              </div>
            )}
            {!job.location && job.isRemote && (
              <div className="flex justify-end">
                <Badge variant="outline" className="text-xs">Remote</Badge>
              </div>
            )}
          </div>

          {/* Notes */}
          {userJob.notes && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-3">
              {userJob.notes}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              {job.formattedCreatedAt}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => onViewJob(job.id)}
                title="View details"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" title="Apply">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Droppable stage column component - memoized for performance
const StageColumn = React.memo(function StageColumn({ kanbanData, onViewJob }: { kanbanData: KanbanData; onViewJob: (jobId: string) => void }) {
  const { stage, userJobs } = kanbanData;
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });
  
  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col w-80 min-w-80 bg-muted/20 rounded-lg p-4 ${
        isOver ? 'bg-muted/40 ring-2 ring-primary/20' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <Badge variant="outline" className="text-xs">
            {userJobs.length}
          </Badge>
        </div>
      </div>
      
      <SortableContext items={userJobs.map(uj => uj.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
          {userJobs.map((userJob) => (
            <DraggableJobCard key={userJob.id} userJob={userJob} onViewJob={onViewJob} />
          ))}
          {userJobs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                </div>
                Drop jobs here
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
});

// Simplified drag overlay for better performance
const SimpleDragOverlay = React.memo(function SimpleDragOverlay({ 
  userJob 
}: { 
  userJob: UserJobWithJob;
}) {
  return (
    <Card className="cursor-grabbing shadow-xl rotate-3 scale-105 border-primary/50">
      <CardContent className="p-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm line-clamp-1">{userJob.job.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{userJob.job.company}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function KanbanPage() {
  const { status } = useSession();
  const [kanbanData, setKanbanData] = useState<KanbanData[]>([]);
  const [activeJob, setActiveJob] = useState<UserJobWithJob | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Filter and search state with URL persistence
  const [searchTerm, setSearchTerm] = useQueryState('search', { 
    defaultValue: '',
    clearOnDefault: true 
  });
  const [selectedCompany, setSelectedCompany] = useQueryState('company', { 
    defaultValue: '',
    clearOnDefault: true 
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );


  // Remove redundant auth check - middleware handles protection

  // Fetch kanban data with authentication-aware hooks (get all user jobs for kanban)
  const { data: userJobsResult, isLoading: userJobsLoading, error: userJobsError, refetch: refetchUserJobs } = useUserJobs({ limit: 1000 });
  const { data: stagesResult, isLoading: stagesLoading, error: stagesError, refetch: refetchStages } = useJobStages();
  
  // Stage update mutation
  const { mutate: updateJobStage } = useJobStageUpdate();

  const isLoading = userJobsLoading || stagesLoading;
  const error = userJobsError || stagesError;

  // Compute filtered and grouped kanban data
  const { filteredKanbanData, availableCompanies, filteredJobCount, totalJobCount } = useMemo(() => {
    if (!userJobsResult?.success || !stagesResult?.success) {
      return { filteredKanbanData: [], availableCompanies: [], filteredJobCount: 0, totalJobCount: 0 };
    }

    // Cast to the correct type since we know the API returns embedded job data
    const userJobs = (userJobsResult.data || []) as UserJobWithJob[];
    const stages = (stagesResult.data || []).sort((a, b) => a.sortOrder - b.sortOrder);

    // Extract unique companies for filter dropdown
    const companies = [...new Set(
      userJobs
        .filter(uj => uj.job?.company)
        .map(uj => uj.job.company)
    )].sort();

    // Apply filters
    const filteredUserJobs = userJobs.filter(uj => {
      if (!uj.job) return false; // Ensure job data exists

      // Search filter (job title, company, description)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          uj.job.title?.toLowerCase().includes(searchLower) ||
          uj.job.company?.toLowerCase().includes(searchLower) ||
          uj.job.description?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Company filter
      if (selectedCompany && selectedCompany !== '__all__' && uj.job.company !== selectedCompany) {
        return false;
      }

      return true;
    });

    // Create kanban structure with filtered jobs
    const kanban: KanbanData[] = stages.map(stage => ({
      stage,
      userJobs: filteredUserJobs
        .filter(uj => uj.stageId === stage.id)
    }));

    return {
      filteredKanbanData: kanban,
      availableCompanies: companies,
      filteredJobCount: filteredUserJobs.length,
      totalJobCount: userJobs.length
    };
  }, [userJobsResult?.success, userJobsResult?.data, stagesResult?.success, stagesResult?.data, searchTerm, selectedCompany]);

  // Update local state for drag and drop (since DnD needs it in state)
  useEffect(() => {
    setKanbanData(filteredKanbanData);
  }, [filteredKanbanData]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const userJob = kanbanData
      .flatMap(k => k.userJobs)
      .find(uj => uj.id === active.id);
    
    if (userJob) {
      setActiveJob(userJob);
    }
  }, [kanbanData]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveJob(null);
    
    if (!over) return;

    const userJobId = active.id as number;
    
    // Find the user job
    const sourceKanban = kanbanData.find(k => 
      k.userJobs.some(uj => uj.id === userJobId)
    );
    const userJob = sourceKanban?.userJobs.find(uj => uj.id === userJobId);
    
    if (!userJob || !sourceKanban) return;

    // Check if we're dropping on a stage (for cross-column moves)
    const targetStage = kanbanData.find(k => k.stage.id === over.id);
    
    if (targetStage) {
      // Cross-column move
      if (userJob.stageId === targetStage.stage.id) return; // Same column, no change needed

      // Optimistically update the UI
      setKanbanData(prev => {
        const updatedUserJob = { ...userJob, stageId: targetStage.stage.id };
        
        return prev.map(kanban => {
          if (kanban.stage.id === targetStage.stage.id) {
            return {
              ...kanban,
              userJobs: [...kanban.userJobs, updatedUserJob]
            };
          }
          if (kanban.stage.id === sourceKanban.stage.id) {
            return {
              ...kanban,
              userJobs: kanban.userJobs.filter(uj => uj.id !== userJobId)
            };
          }
          return kanban;
        });
      });

      // Update backend
      updateJobStage(
        { jobId: userJob.jobId, stageId: targetStage.stage.id.toString() },
        {
          onError: () => refetchUserJobs()
        }
      );
    } else {
      // Same-column reordering - find the old and new index
      const oldIndex = sourceKanban.userJobs.findIndex(uj => uj.id === userJobId);
      const overId = over.id as number;
      const newIndex = sourceKanban.userJobs.findIndex(uj => uj.id === overId);
      
      if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
        // Update local state for same-column reordering
        setKanbanData(prev => {
          return prev.map(kanban => {
            if (kanban.stage.id === sourceKanban.stage.id) {
              return {
                ...kanban,
                userJobs: arrayMove(kanban.userJobs, oldIndex, newIndex)
              };
            }
            return kanban;
          });
        });
        // Note: No backend update needed as we don't store position
      }
    }
  }, [kanbanData, updateJobStage, refetchUserJobs]);

  const handleViewJob = useCallback((jobId: string) => {
    setSelectedJobId(jobId);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerUpdate = useCallback(() => {
    // Refresh kanban data when drawer updates something
    refetchUserJobs();
    refetchStages();
  }, [refetchUserJobs, refetchStages]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading kanban board...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-destructive">{error.message || 'Failed to load kanban board'}</div>
          <Button onClick={() => {
            refetchUserJobs();
            refetchStages();
          }}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Job Pipeline</h1>
          <p className="text-muted-foreground mb-4">
            Drag and drop jobs to manage your application pipeline
          </p>
          
          {/* Filter and Search Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Search Input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search job titles, companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Company Filter */}
              <div className="min-w-[200px]">
                <Select value={selectedCompany || undefined} onValueChange={(value) => setSelectedCompany(value || '')}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Companies</SelectItem>
                    {availableCompanies.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {(searchTerm || (selectedCompany && selectedCompany !== '__all__')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCompany('');
                  }}
                  className="shrink-0"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              {filteredJobCount !== totalJobCount ? (
                <>Showing {filteredJobCount} of {totalJobCount} jobs</>
              ) : (
                <>{totalJobCount} jobs</>
              )}
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
            {kanbanData.map((kanban) => (
              <StageColumn key={kanban.stage.id} kanbanData={kanban} onViewJob={handleViewJob} />
            ))}
          </div>

          <DragOverlay>
            {activeJob ? (
              <SimpleDragOverlay userJob={activeJob} />
            ) : null}
          </DragOverlay>
        </DndContext>

        {kanbanData.every(k => k.userJobs.length === 0) && (
          <div className="text-center py-16">
            <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tracked jobs yet</h3>
            <p className="text-muted-foreground mb-6">
              Start tracking jobs to see them in your pipeline
            </p>
            <Button asChild>
              <Link href="/jobs">
                Browse Jobs
              </Link>
            </Button>
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