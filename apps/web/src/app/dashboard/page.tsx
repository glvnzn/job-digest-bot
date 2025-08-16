'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
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
  RefreshCw
} from 'lucide-react';

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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchDashboardStats();
    }
  }, [status, router]);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Note: This endpoint needs to be implemented in the backend
      const response = await fetch('/api/v1/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${session?.apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          setError('Failed to fetch dashboard stats');
        }
      } else {
        // For now, show placeholder data if endpoint doesn't exist
        setStats({
          overview: {
            totalJobsAvailable: 156,
            totalSavedJobs: 12,
            averageRelevanceScore: 78.5
          },
          activity: {
            thisWeek: { saved: 3, growth: 50 },
            thisMonth: { saved: 12, growth: 20 }
          },
          jobsByStage: [
            { stage: { id: 1, name: 'Interested', color: '#3B82F6' }, count: 5 },
            { stage: { id: 2, name: 'Applied', color: '#F59E0B' }, count: 4 },
            { stage: { id: 3, name: 'Interview', color: '#10B981' }, count: 2 },
            { stage: { id: 4, name: 'Offer', color: '#8B5CF6' }, count: 1 }
          ],
          topCompanies: [
            { company: 'TechCorp', count: 3 },
            { company: 'StartupXYZ', count: 2 },
            { company: 'BigTech Inc', count: 2 }
          ],
          recentActivity: [
            {
              id: 1,
              job: { id: '1', title: 'Senior Developer', company: 'TechCorp' },
              stage: { name: 'Applied', color: '#F59E0B' },
              updatedAt: new Date().toISOString()
            }
          ]
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

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
          <div className="text-destructive">{error}</div>
          <Button onClick={fetchDashboardStats}>Try Again</Button>
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
              <Button asChild variant="ghost" size="sm" className="bg-muted">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/jobs">Jobs</Link>
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
      </main>
    </div>
  );
}