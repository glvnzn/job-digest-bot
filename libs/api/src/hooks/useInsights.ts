import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '../client';

// Types for insights data
export interface TechStackItem {
  technology: string;
  frequency: number;
  category: string;
  importance: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
}

export interface SkillGap {
  skill: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  frequency: number;
  reasoning: string;
  learningPath: string;
}

export interface CareerRecommendation {
  type: string;
  title: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  actionItems: string[];
  timeframe: string;
}

export interface MarketTrend {
  trend: string;
  growth: string;
  description: string;
  impact: string;
}

export interface PreparationAdvice {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
}

export interface InsightsMetadata {
  analyzedJobs: number;
  trackedJobs: number;
  generatedAt: string;
  dataFreshness: 'current' | 'cached';
}

export interface CareerInsights {
  techStackAnalysis: TechStackItem[];
  skillGaps: SkillGap[];
  recommendations: CareerRecommendation[];
  marketTrends: MarketTrend[];
  preparationAdvice: PreparationAdvice;
  metadata: InsightsMetadata;
}

export interface TechTrendItem {
  technology: string;
  mentions: number;
  percentage: number;
  category: string;
  trend: 'stable' | 'rising' | 'emerging' | 'niche';
}

export interface TechTrends {
  trendingTechnologies: TechTrendItem[];
  totalJobsAnalyzed: number;
  userTrackedJobs: number;
  lastUpdated: string;
}

/**
 * Hook for fetching career insights
 */
export function useCareerInsights() {
  const { data: session, status } = useSession();
  
  const isReady = !!(session?.user && (session as any)?.apiToken && status === 'authenticated');
  
  return useQuery({
    queryKey: ['insights', 'career'],
    queryFn: () => apiClient.insights.getCareerInsights(),
    enabled: isReady,
    staleTime: 10 * 60 * 1000, // 10 minutes - insights don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false, // Don't refetch on window focus for expensive operations
  });
}

/**
 * Hook for fetching technology trends
 */
export function useTechTrends() {
  const { data: session, status } = useSession();
  
  const isReady = !!(session?.user && (session as any)?.apiToken && status === 'authenticated');
  
  return useQuery({
    queryKey: ['insights', 'tech-trends'],
    queryFn: () => apiClient.insights.getTechTrends(),
    enabled: isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Combined hook for all insights data (similar to useDashboardData pattern)
 */
export function useInsightsData() {
  const careerQuery = useCareerInsights();
  const techTrendsQuery = useTechTrends();

  const isLoading = careerQuery.isLoading || techTrendsQuery.isLoading;
  const error = careerQuery.error || techTrendsQuery.error;

  // Extract data from successful responses with proper null checks
  const careerInsights = (careerQuery.data && careerQuery.data.success) ? careerQuery.data.data : null;
  const techTrends = (techTrendsQuery.data && techTrendsQuery.data.success) ? techTrendsQuery.data.data : null;

  return {
    careerInsights,
    techTrends,
    isLoading,
    error,
    refetch: () => {
      careerQuery.refetch();
      techTrendsQuery.refetch();
    },
    // Individual query objects for more granular control
    careerQuery,
    techTrendsQuery,
  };
}