'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { useInsightsData } from '@libs/api';
import { 
  Brain, 
  ArrowRight, 
  Code, 
  Target, 
  Lightbulb, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';

export function InsightsPreview() {
  const { careerInsights, techTrends, isLoading, error } = useInsightsData();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Career Insights & Advisory
              </CardTitle>
              <CardDescription>AI-powered career recommendations</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/insights">
                View Details
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Unable to load insights. Click to view details.
            </p>
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
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Career Insights & Advisory
            </CardTitle>
            <CardDescription>
              AI-powered analysis of job market trends and personalized recommendations
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
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tech Stack Analysis */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Tech Stack Demand</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Most in-demand technologies based on current job market analysis
              </p>
              <div className="space-y-2">
                {careerInsights?.techStackAnalysis?.slice(0, 3).map((tech, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{tech.technology}</span>
                    <Badge variant="secondary" className="text-xs">
                      {tech.frequency}%
                    </Badge>
                  </div>
                )) || (
                  <div className="text-xs text-muted-foreground">
                    Loading market data...
                  </div>
                )}
              </div>
            </div>

            {/* Skill Gap Analysis */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-sm">Priority Skills</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Key skills to focus on for better career opportunities
              </p>
              <div className="space-y-2">
                {careerInsights?.skillGaps?.slice(0, 2).map((gap, index) => {
                  const getPriorityColor = (priority: string) => {
                    switch (priority.toLowerCase()) {
                      case 'critical': return 'bg-red-500';
                      case 'high': return 'bg-orange-500';
                      case 'medium': return 'bg-yellow-500';
                      default: return 'bg-gray-500';
                    }
                  };

                  return (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(gap.priority)}`} />
                      <span className="flex-1">{gap.skill}</span>
                      <span className="text-muted-foreground">{gap.frequency}%</span>
                    </div>
                  );
                }) || (
                  <div className="text-xs text-muted-foreground">
                    Analyzing your skill profile...
                  </div>
                )}
              </div>
            </div>

            {/* Career Roadmap */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm">Next Steps</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Personalized roadmap for advancing your career goals
              </p>
              <div className="space-y-2">
                {careerInsights?.recommendations?.slice(0, 2).map((rec, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {rec.priority === 'High' || rec.priority === 'Critical' ? (
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="leading-tight">{rec.title}</span>
                  </div>
                )) || (
                  <div className="text-xs text-muted-foreground">
                    Generating personalized recommendations...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Data freshness indicator */}
        {careerInsights?.metadata && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3 w-3" />
                <span>
                  Updated {new Date(careerInsights.metadata.generatedAt).toLocaleDateString()}
                </span>
              </div>
              <span>{careerInsights.metadata.analyzedJobs} jobs analyzed</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}