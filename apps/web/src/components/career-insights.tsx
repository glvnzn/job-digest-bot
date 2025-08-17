'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Brain,
  Target,
  BookOpen,
  Lightbulb,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  Star,
  Code,
  Zap
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CareerInsightsProps {
  className?: string;
}

export function CareerInsights({ className }: CareerInsightsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [techTrends, setTechTrends] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [careerResult, trendsResult] = await Promise.all([
        apiClient.insights.getCareerInsights(),
        apiClient.insights.getTechTrends()
      ]);

      if (careerResult.success) {
        setInsights(careerResult.data);
      }

      if (trendsResult.success) {
        setTechTrends(trendsResult.data);
      }

      if (!careerResult.success && !trendsResult.success) {
        setError('Failed to load career insights');
      }

    } catch (err) {
      console.error('Error fetching career insights:', err);
      setError('Failed to load career insights');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend.includes('rising') || trend.includes('increasing')) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    if (trend.includes('emerging')) {
      return <Zap className="h-4 w-4 text-blue-600" />;
    }
    return <BarChart3 className="h-4 w-4 text-gray-600" />;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Career Insights & Advisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Analyzing your career opportunities...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Career Insights & Advisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-destructive mb-4">{error}</div>
            <Button onClick={fetchInsights} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Career Insights & Advisor
          </CardTitle>
          <CardDescription>
            AI-powered analysis of job market trends and personalized career development recommendations
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Tech Stack Analysis */}
      {insights?.techStackAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="h-5 w-5" />
              Tech Stack Demand Analysis
            </CardTitle>
            <CardDescription>
              Most in-demand technologies across job postings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.techStackAnalysis.slice(0, 6).map((tech: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{tech.technology}</span>
                      <Badge variant="outline" className="text-xs">
                        {tech.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tech.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{tech.frequency}%</div>
                    <Badge variant={tech.importance === 'Critical' ? 'destructive' : 'secondary'} className="text-xs">
                      {tech.importance}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Gaps & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Gaps */}
        {insights?.skillGaps && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Skill Gap Analysis
              </CardTitle>
              <CardDescription>
                Skills to focus on for better opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.skillGaps.map((gap: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{gap.skill}</h4>
                      <Badge variant={getPriorityColor(gap.priority)} className="text-xs">
                        {gap.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{gap.reasoning}</p>
                    <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                      <strong>Learning Path:</strong> {gap.learningPath}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Market Trends */}
        {techTrends?.trendingTechnologies && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Trends
              </CardTitle>
              <CardDescription>
                Trending technologies in the job market
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {techTrends.trendingTechnologies.slice(0, 8).map((tech: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(tech.trend)}
                      <span className="text-sm font-medium">{tech.technology}</span>
                      <Badge variant="outline" className="text-xs">
                        {tech.category}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">{tech.percentage}%</span>
                      <div className="text-xs text-muted-foreground capitalize">{tech.trend}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Career Recommendations */}
      {insights?.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Personalized Recommendations
            </CardTitle>
            <CardDescription>
              Strategic advice to accelerate your career growth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.recommendations.map((rec: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-xs">
                      {rec.type}
                    </Badge>
                    <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                      {rec.priority}
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-2">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {rec.timeframe}
                    </div>
                    <div className="space-y-1">
                      {rec.actionItems.slice(0, 3).map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preparation Roadmap */}
      {insights?.preparationAdvice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Career Preparation Roadmap
            </CardTitle>
            <CardDescription>
              Strategic timeline for career advancement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <h4 className="font-semibold">Immediate (1-4 weeks)</h4>
                </div>
                <ul className="space-y-2">
                  {insights.preparationAdvice.immediate.map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <h4 className="font-semibold">Short-term (1-6 months)</h4>
                </div>
                <ul className="space-y-2">
                  {insights.preparationAdvice.shortTerm.map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h4 className="font-semibold">Long-term (6+ months)</h4>
                </div>
                <ul className="space-y-2">
                  {insights.preparationAdvice.longTerm.map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Metadata */}
      {insights?.metadata && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>📊 Analyzed {insights.metadata.analyzedJobs} jobs</span>
                <span>⭐ {insights.metadata.trackedJobs} tracked</span>
                <span>🔄 Updated {new Date(insights.metadata.generatedAt).toLocaleDateString()}</span>
              </div>
              <Button onClick={fetchInsights} variant="ghost" size="sm">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}