'use client';

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
import { useInsightsData } from '@libs/api';

interface CareerInsightsProps {
  className?: string;
}

export function CareerInsights({ className }: CareerInsightsProps) {
  // Fetch career insights with custom hook following established patterns
  const { careerInsights, techTrends, isLoading, error, refetch: refetchInsights } = useInsightsData();

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return <AlertTriangle className="h-3 w-3" />;
      case 'high': return <Target className="h-3 w-3" />;
      case 'medium': return <Clock className="h-3 w-3" />;
      case 'low': return <CheckCircle className="h-3 w-3" />;
      default: return <Target className="h-3 w-3" />;
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
            <div className="text-destructive mb-4">{error?.message || 'Failed to load career insights'}</div>
            <Button onClick={refetchInsights} variant="outline">
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
      {careerInsights?.techStackAnalysis && (
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
              {careerInsights.techStackAnalysis.slice(0, 6).map((tech: any, index: number) => (
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Skill Gap Analysis
            </CardTitle>
            <CardDescription>
              {careerInsights?.skillGaps && careerInsights.skillGaps.length > 0 
                ? `${careerInsights.skillGaps.length} key skills to focus on for better opportunities`
                : 'Analyzing your skill portfolio against market demand'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {careerInsights?.skillGaps && careerInsights.skillGaps.length > 0 ? (
              <div className="space-y-4">
                {careerInsights.skillGaps.map((gap: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base">{gap.skill}</h4>
                        <Badge variant="outline" className="text-xs">
                          {gap.frequency}% demand
                        </Badge>
                      </div>
                      <Badge variant={getPriorityColor(gap.priority)} className="text-xs flex items-center gap-1">
                        {getPriorityIcon(gap.priority)}
                        {gap.priority} Priority
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {gap.reasoning}
                    </p>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                            Recommended Learning Path
                          </h5>
                          <div className="text-xs text-blue-700 dark:text-blue-200 space-y-1">
                            {gap.learningPath.split(/\d+\.\s*/).filter(Boolean).map((step: string, stepIndex: number) => (
                              <div key={stepIndex} className="flex items-start gap-2">
                                <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-600 rounded-full shrink-0">
                                  {stepIndex + 1}
                                </span>
                                <span className="leading-tight">{step.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Learning Progress Encouragement */}
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-green-600" />
                    <h4 className="font-medium text-green-900 dark:text-green-100">Pro Tip</h4>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-200">
                    Focus on the top 2-3 high-priority skills first. Mastering one skill thoroughly is more valuable than surface-level knowledge of many.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-100">
                  Great Skill Portfolio!
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  {careerInsights ? 
                    'Your skills align well with current market demand. Consider exploring emerging technologies to stay ahead.' :
                    'Loading your personalized skill gap analysis...'
                  }
                </p>
                {careerInsights && (
                  <Button variant="outline" size="sm" onClick={refetchInsights}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh Analysis
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
      {careerInsights?.recommendations && (
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
              {careerInsights.recommendations.map((rec: any, index: number) => (
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
      {careerInsights?.preparationAdvice && (
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
                  {careerInsights.preparationAdvice.immediate.map((item: string, index: number) => (
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
                  {careerInsights.preparationAdvice.shortTerm.map((item: string, index: number) => (
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
                  {careerInsights.preparationAdvice.longTerm.map((item: string, index: number) => (
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
      {careerInsights?.metadata && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>📊 Analyzed {careerInsights.metadata.analyzedJobs} jobs</span>
                <span>⭐ {careerInsights.metadata.trackedJobs} tracked</span>
                <span>🔄 Updated {new Date(careerInsights.metadata.generatedAt).toLocaleDateString()}</span>
              </div>
              <Button onClick={refetchInsights} variant="ghost" size="sm">
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