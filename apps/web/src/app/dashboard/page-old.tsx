'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { JobDetailsDrawer } from '@/components/job-details-drawer';
import { useDashboardData } from '@libs/api';
import { useJobTracker } from '@/hooks/use-jobs';
import { 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  Star, 
  Clock, 
  BarChart3,
  Calendar,
  Building2,
  MapPin,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Eye,
  Loader2,
  X,
  Brain,
  Target,
  Code,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';

interface DashboardStats {
  overview: {
    totalJobsAvailable: number;
    totalSavedJobs: number;
    averageRelevanceScore: number;
  };
  activity: {
    thisWeek: {
      saved: number;
      growth: number;
    };
    thisMonth: {
      saved: number;
      growth: number;
    };
  };
  jobsByStage: Array<{
    stage: {
      id: number;
      name: string;
      color: string;
    };
    count: number;
  }>;
  topCompanies: Array<{
    company: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: number;
    job: {
      id: string;
      title: string;
      company: string;
    };
    stage: {
      name: string;
      color: string;
    };
    updatedAt: string;
  }>;
}

// Component for displaying and managing tracked jobs
interface TrackedJobsListProps {
  userJobs: any[];
  jobs: any[];
  stages: any[];
  isLoading: boolean;
}

function TrackedJobsList({ userJobs, jobs, stages, isLoading, onUpdate }: TrackedJobsListProps & { onUpdate: () => void }) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { untrack, isUntracking } = useJobTracker();

  const handleUntrackJob = (jobId: string) => {
    untrack(jobId, {
      onSuccess: () => {
        // Refresh dashboard data
        onUpdate();
      },
      onError: (error) => {
        console.error('Error untracking job:', error);
      }
    });
  };

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsDrawerOpen(true);
  };

  const handleDrawerUpdate = () => {
    // Refresh data when drawer updates something
    onUpdate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        Loading tracked jobs...
      </div>
    );
  }

  if (userJobs.length === 0) {
    return (
      <div className="text-center py-8">
        <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground mb-4">No tracked jobs yet</p>
        <Button asChild variant="outline">
          <Link href="/jobs">
            Start Tracking Jobs
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {userJobs.map((userJob) => {
        const job = jobs.find(j => j.id === userJob.jobId);
        const stage = stages.find(s => s.id === userJob.stageId);
        
        if (!job) return null;

        return (
          <div key={userJob.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="flex items-start gap-3 flex-1">
              <div 
                className="w-3 h-3 rounded-full mt-1" 
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
                      <span>{job.location}</span>
                    </>
                  )}
                  {job.isRemote && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary" className="text-xs px-1 py-0">Remote</Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <Badge variant="outline" style={{ color: stage?.color }}>
                    {stage?.name || 'Unknown Stage'}
                  </Badge>
                  <Badge variant="secondary">{job.relevancePercentage}% match</Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 ml-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => handleViewJob(job.id)}
                title="View job details"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" title="Apply">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => handleUntrackJob(job.id)}
                disabled={isUntracking(job.id)}
                title="Untrack job"
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
      
      {/* Job Details Drawer */}
      <JobDetailsDrawer
        jobId={selectedJobId}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onJobUpdate={handleDrawerUpdate}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  // Fetch dashboard data with custom hook
  const { stats, isLoading, error, refetch: refetchDashboard, jobsQuery, userJobsQuery, stagesQuery } = useDashboardData(status === 'authenticated');

  // Get data from hooks
  const userJobs = userJobsQuery.data?.data || [];
  const jobs = jobsQuery.data?.data || [];
  const stages = stagesQuery.data?.data || [];


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <BarChart3 className="h-4 w-4 text-gray-600" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-destructive">{error.message || 'Failed to load dashboard'}</div>
          <Button onClick={refetchDashboard}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs Available</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.overview.totalJobsAvailable || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Jobs in the system
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tracked Jobs</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.overview.totalSavedJobs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Jobs you're tracking
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Match Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.overview.averageRelevanceScore?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average relevance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">This Week</CardTitle>
                <CardDescription>Your job search activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{stats?.activity.thisWeek.saved || 0}</div>
                    <p className="text-sm text-muted-foreground">Jobs tracked</p>
                  </div>
                  <div className={`flex items-center gap-1 ${getGrowthColor(stats?.activity.thisWeek.growth || 0)}`}>
                    {getGrowthIcon(stats?.activity.thisWeek.growth || 0)}
                    <span className="text-sm font-medium">
                      {Math.abs(stats?.activity.thisWeek.growth || 0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">This Month</CardTitle>
                <CardDescription>Monthly job search progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{stats?.activity.thisMonth.saved || 0}</div>
                    <p className="text-sm text-muted-foreground">Jobs tracked</p>
                  </div>
                  <div className={`flex items-center gap-1 ${getGrowthColor(stats?.activity.thisMonth.growth || 0)}`}>
                    {getGrowthIcon(stats?.activity.thisMonth.growth || 0)}
                    <span className="text-sm font-medium">
                      {Math.abs(stats?.activity.thisMonth.growth || 0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Jobs by Stage & Top Companies */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Jobs by Stage</CardTitle>
                <CardDescription>Current status of tracked jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.jobsByStage.map((item) => (
                    <div key={item.stage.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.stage.color }}
                        />
                        <span className="text-sm">{item.stage.name}</span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                  {(!stats?.jobsByStage || stats.jobsByStage.length === 0) && (
                    <p className="text-sm text-muted-foreground">No tracked jobs yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Companies</CardTitle>
                <CardDescription>Companies you're most interested in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topCompanies.map((company, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{company.company}</span>
                      </div>
                      <Badge variant="outline">{company.count} jobs</Badge>
                    </div>
                  ))}
                  {(!stats?.topCompanies || stats.topCompanies.length === 0) && (
                    <p className="text-sm text-muted-foreground">No company data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tracked Jobs List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Tracked Jobs</CardTitle>
                <CardDescription>Manage your job application pipeline</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/kanban">
                    View Kanban
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/jobs">
                    Browse More Jobs
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TrackedJobsList 
                userJobs={userJobs}
                jobs={jobs}
                stages={stages}
                onUpdate={refetchDashboard}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Your latest job tracking updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: activity.stage.color }}
                      />
                      <div>
                        <p className="text-sm font-medium">{activity.job.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.job.company} • {activity.stage.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(activity.updatedAt)}
                    </div>
                  </div>
                ))}
                {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No recent activity</p>
                    <Button asChild variant="outline">
                      <Link href="/jobs">
                        Browse Jobs
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Career Insights Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Career Insights & Advisory
                </CardTitle>
                <CardDescription>
                  AI-powered market analysis and personalized career recommendations
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/insights">
                  View Full Analysis
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Tech Stack Analysis</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Discover the most in-demand technologies and frameworks in your field
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">React 85%</Badge>
                  <Badge variant="secondary" className="text-xs">TypeScript 78%</Badge>
                  <Badge variant="secondary" className="text-xs">Node.js 72%</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-sm">Skill Gap Analysis</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Identify critical skills to focus on for better opportunities
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Kubernetes - High Priority</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>GraphQL - Medium Priority</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Career Roadmap</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Strategic timeline for advancing your career with actionable steps
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Cloud architecture mastery</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>AI/ML integration skills</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}