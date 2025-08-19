'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase,
  ArrowLeft,
  Building2,
  MapPin,
  ExternalLink,
  Eye,
  RefreshCw,
  GripVertical
} from 'lucide-react';
import { apiClient, type Job, type UserJob, type JobStage } from '@libs/api';
import { JobDetailsDrawer } from '@/components/job-details-drawer';

// Force dynamic rendering to avoid build-time env issues
export const dynamic = 'force-dynamic';

interface KanbanData {
  stage: JobStage;
  userJobs: (UserJob & { job: Job })[];
}

// Draggable job card component
function DraggableJobCard({ 
  userJob, 
  isDragging, 
  onViewJob 
}: { 
  userJob: UserJob & { job: Job }; 
  isDragging?: boolean;
  onViewJob: (jobId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: userJob.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { job } = userJob;

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${isDragging ? 'opacity-50 shadow-lg scale-105' : 'hover:scale-[1.02]'}`}
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
}

// Droppable stage column component
function StageColumn({ kanbanData, onViewJob }: { kanbanData: KanbanData; onViewJob: (jobId: string) => void }) {
  const { stage, userJobs } = kanbanData;
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });
  
  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col w-80 min-w-80 bg-muted/20 rounded-lg p-4 transition-colors ${
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
}

export default function KanbanPage() {
  const { status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [kanbanData, setKanbanData] = useState<KanbanData[]>([]);
  const [activeJob, setActiveJob] = useState<(UserJob & { job: Job }) | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  // Fetch kanban data with React Query
  const { data: userJobsResult, isLoading: userJobsLoading, error: userJobsError } = useQuery({
    queryKey: ['kanban-userJobs'],
    queryFn: () => apiClient.userJobs.getAll(),
    enabled: status === 'authenticated',
  });

  const { data: jobsResult, isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ['kanban-jobs', { limit: 1000 }],
    queryFn: () => apiClient.jobs.getAll({ limit: 1000 }),
    enabled: status === 'authenticated',
  });

  const { data: stagesResult, isLoading: stagesLoading, error: stagesError } = useQuery({
    queryKey: ['kanban-stages'],
    queryFn: () => apiClient.stages.getAll(),
    enabled: status === 'authenticated',
  });

  const isLoading = userJobsLoading || jobsLoading || stagesLoading;
  const error = userJobsError || jobsError || stagesError;

  // Update kanban data when queries change
  useEffect(() => {
    if (userJobsResult?.success && jobsResult?.success && stagesResult?.success) {
      const userJobs = userJobsResult.data || [];
      const jobs = jobsResult.data || [];
      const stages = (stagesResult.data || []).sort((a, b) => a.sortOrder - b.sortOrder);

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
  }, [userJobsResult, jobsResult, stagesResult]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const userJob = kanbanData
      .flatMap(k => k.userJobs)
      .find(uj => uj.id === active.id);
    
    if (userJob) {
      setActiveJob(userJob);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveJob(null);
    
    if (!over) return;

    const userJobId = active.id as number;
    const targetStageId = over.id as number;

    // Find the user job and its current stage
    const currentKanban = kanbanData.find(k => 
      k.userJobs.some(uj => uj.id === userJobId)
    );
    
    const userJob = currentKanban?.userJobs.find(uj => uj.id === userJobId);
    
    if (!userJob || userJob.stageId === targetStageId) return;

    // Optimistically update the UI
    setKanbanData(prev => {
      return prev.map(kanban => ({
        ...kanban,
        userJobs: kanban.stage.id === targetStageId
          ? [...kanban.userJobs, { ...userJob, stageId: targetStageId }]
          : kanban.userJobs.filter(uj => uj.id !== userJobId)
      }));
    });

    // Update via API
    try {
      const result = await apiClient.userJobs.updateStage(userJob.jobId, targetStageId.toString());
      
      if (!result.success) {
        // Revert on error by invalidating queries
        queryClient.invalidateQueries({ queryKey: ['kanban-userJobs'] });
        queryClient.invalidateQueries({ queryKey: ['kanban-jobs'] });
        console.error('Failed to update job stage:', result.error);
      }
    } catch (err) {
      // Revert on error by invalidating queries
      queryClient.invalidateQueries({ queryKey: ['kanban-userJobs'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-jobs'] });
      console.error('Error updating job stage:', err);
    }
  };

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsDrawerOpen(true);
  };

  const handleDrawerUpdate = () => {
    // Refresh kanban data when drawer updates something
    queryClient.invalidateQueries({ queryKey: ['kanban-userJobs'] });
    queryClient.invalidateQueries({ queryKey: ['kanban-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['kanban-stages'] });
  };

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
            queryClient.invalidateQueries({ queryKey: ['kanban-userJobs'] });
            queryClient.invalidateQueries({ queryKey: ['kanban-jobs'] });
            queryClient.invalidateQueries({ queryKey: ['kanban-stages'] });
          }}>Try Again</Button>
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
              <Button asChild variant="ghost" size="sm">
                <Link href="/jobs">Jobs</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="bg-muted">
                <Link href="/kanban">Kanban</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/insights">Career Insights</Link>
              </Button>
            </nav>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Job Pipeline</h1>
          <p className="text-muted-foreground">
            Drag and drop jobs to manage your application pipeline
          </p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
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
              <DraggableJobCard userJob={activeJob} isDragging onViewJob={handleViewJob} />
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