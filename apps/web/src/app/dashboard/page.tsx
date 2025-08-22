'use client';

import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDashboardData } from '@libs/api';
import { AppHeader } from '@/components/layout/app-header';
import { useDashboardPreferences } from '@/hooks/use-dashboard-preferences';

// Dashboard components
import { StatsCard } from '@/components/dashboard/stats-card';
import { SimpleChart } from '@/components/dashboard/simple-chart';
import { TrackedJobsWidget } from '@/components/dashboard/tracked-jobs-widget';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { InsightsPreview } from '@/components/dashboard/insights-preview';

import { 
  Briefcase, 
  Star, 
  BarChart3, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function EnhancedDashboardPage() {
  const { data: session, status } = useSession();
  const { enabledWidgets } = useDashboardPreferences();

  const { 
    stats, 
    isLoading, 
    error, 
    refetch: refetchDashboard, 
    jobsQuery, 
    userJobsQuery, 
    stagesQuery 
  } = useDashboardData(status === 'authenticated');

  // Memoized data extraction
  const dashboardData = useMemo(() => ({
    userJobs: userJobsQuery.data?.data || [],
    jobs: jobsQuery.data?.data || [],
    stages: stagesQuery.data?.data || []
  }), [userJobsQuery.data, jobsQuery.data, stagesQuery.data]);

  // Memoized chart data
  const chartData = useMemo(() => {
    if (!stats) return { stageData: [], companyData: [] };

    const stageData = stats.jobsByStage.map(item => ({
      label: item.stage.name,
      value: item.count,
      color: item.stage.color
    }));

    const companyData = stats.topCompanies.map(company => ({
      label: company.company,
      value: company.count,
      color: '#3B82F6'
    }));

    return { stageData, companyData };
  }, [stats]);

  // Optimized refresh callback
  const handleRefresh = useCallback(() => {
    refetchDashboard();
  }, [refetchDashboard]);

  // Helper function to check if widget is enabled
  const isWidgetEnabled = (widgetId: string) => {
    return enabledWidgets.some(widget => widget.id === widgetId);
  };

  // Loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-lg">Loading your dashboard...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Dashboard Error
                </CardTitle>
                <CardDescription>
                  We encountered an issue loading your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {error.message || 'Failed to load dashboard data'}
                </p>
                <Button onClick={handleRefresh} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-muted-foreground">
                Here's your job search progress and latest opportunities
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Overview Stats */}
          {isWidgetEnabled('stats') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Jobs Available"
                value={stats?.overview.totalJobsAvailable?.toLocaleString() || '0'}
                description="Total opportunities"
                icon={Briefcase}
              />
              <StatsCard
                title="Tracked Jobs"
                value={stats?.overview.totalSavedJobs || 0}
                description="In your pipeline"
                icon={Star}
                trend={{
                  value: stats?.activity.thisWeek.growth || 0,
                  isPositive: (stats?.activity.thisWeek.growth || 0) >= 0
                }}
              />
              <StatsCard
                title="Avg. Match Score"
                value={`${stats?.overview.averageRelevanceScore?.toFixed(1) || 0}%`}
                description="Relevance to your profile"
                icon={BarChart3}
              />
            </div>
          )}

          {/* Quick Actions */}
          {isWidgetEnabled('quickActions') && <QuickActions />}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Jobs by Stage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Pipeline</CardTitle>
                  <CardDescription>Current status of your tracked jobs</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.stageData.length > 0 ? (
                    <SimpleChart data={chartData.stageData} type="donut" height={200} />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      No tracked jobs yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Companies */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Companies</CardTitle>
                  <CardDescription>Companies you're most interested in</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.companyData.length > 0 ? (
                    <SimpleChart data={chartData.companyData} type="bar" height={160} />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      No company data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Activity Timeline */}
              <ActivityTimeline activities={stats?.recentActivity || []} />

              {/* Activity Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.activity.thisWeek.saved || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">jobs tracked</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.activity.thisMonth.saved || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">jobs tracked</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Tracked Jobs Section */}
          {isWidgetEnabled('trackedJobs') && (
            <TrackedJobsWidget
              userJobs={dashboardData.userJobs}
              jobs={dashboardData.jobs}
              stages={dashboardData.stages}
              isLoading={isLoading}
              onUpdate={handleRefresh}
            />
          )}

          {/* Career Insights Preview */}
          {isWidgetEnabled('insights') && <InsightsPreview />}
        </div>
      </main>
    </div>
  );
}