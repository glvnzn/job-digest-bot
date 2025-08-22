import { Job, UserJob, JobStage } from '@libs/api';

// Dashboard-specific types
export interface DashboardStats {
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

// Widget props interfaces
export interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export interface TrackedJobsListProps {
  userJobs: UserJob[];
  jobs: Job[];
  stages: JobStage[];
  isLoading: boolean;
  onUpdate: () => void;
}

export interface ActivityCardProps {
  period: 'week' | 'month';
  data: {
    saved: number;
    growth: number;
  };
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  showPercentage?: boolean;
}