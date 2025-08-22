import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { Clock, ArrowRight, Plus } from 'lucide-react';

interface ActivityItem {
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
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Your latest job tracking updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No recent activity</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track jobs to see your activity timeline
            </p>
            <Button asChild variant="outline">
              <Link href="/jobs">
                Browse Jobs
                <Plus className="h-4 w-4 ml-1" />
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Your latest job tracking updates</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/kanban">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity, index) => (
            <div key={activity.id} className="relative flex items-start gap-3">
              {/* Timeline line */}
              {index < activities.length - 1 && index < 4 && (
                <div className="absolute left-2 top-6 w-0.5 h-8 bg-border" />
              )}
              
              {/* Stage indicator */}
              <div 
                className="w-4 h-4 rounded-full border-2 border-background flex-shrink-0 mt-0.5"
                style={{ backgroundColor: activity.stage.color }}
              />
              
              {/* Activity content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    {activity.job.title}
                  </p>
                  <time className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatRelativeTime(activity.updatedAt)}
                  </time>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {activity.job.company}
                  </p>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Badge 
                    variant="outline" 
                    className="text-xs h-5"
                    style={{ 
                      borderColor: activity.stage.color + '40',
                      color: activity.stage.color 
                    }}
                  >
                    {activity.stage.name}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {activities.length > 5 && (
          <div className="mt-4 pt-4 border-t">
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/kanban">
                View {activities.length - 5} more activities
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}