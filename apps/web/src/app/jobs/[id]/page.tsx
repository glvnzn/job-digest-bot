'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { apiClient, type Job as BaseJob } from '@libs/api';

type Job = BaseJob & {
  requirements?: string[];
  emailMessageId?: string;
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && params.id) {
      fetchJobDetails(params.id as string);
    }
  }, [params.id, router, status]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      setIsLoading(true);
      const result = await apiClient.jobs.getById(jobId);

      if (result.success && result.data) {
        setJob(result.data);
      } else {
        setError(result.error || 'Job not found');
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError('Failed to load job details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Note: Date formatting and score calculations should be moved to backend API
  // Frontend should receive pre-formatted data to remain "dumb"

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading job details...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-destructive">{error || 'Job not found'}</div>
          <Button onClick={() => router.push('/jobs')}>
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/jobs')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
          <h1 className="text-2xl font-bold">Job Details</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Job Info */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  <CardDescription className="text-lg">
                    {job.company}
                  </CardDescription>
                </div>
                <Badge 
                  variant={job.relevanceBadgeVariant || "secondary"}
                  className="text-sm"
                >
                  {job.relevancePercentage}% Match
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Location:</span>
                  <span>{job.location || 'Not specified'}</span>
                  {job.isRemote && (
                    <Badge variant="secondary">Remote</Badge>
                  )}
                </div>
                
                {job.salary && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Salary:</span>
                    <span>{job.salary}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="font-medium">Source:</span>
                  <span className="capitalize">{job.source}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">Posted:</span>
                  <span>{job.formattedPostedDate}</span>
                </div>
              </div>

              <div className="pt-4">
                <Button asChild size="lg">
                  <a 
                    href={job.applyUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    Apply Now
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Job Description */}
          {job.description && (
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {job.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-3 text-sm leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground mt-1">•</span>
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Meta Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Job ID:</span>
                  <span className="ml-2 text-muted-foreground font-mono text-xs">
                    {job.id}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Processed:</span>
                  <span className="ml-2">
                    {job.processed ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Added to system:</span>
                  <span className="ml-2">
                    {job.formattedCreatedAt}
                  </span>
                </div>
                {job.emailMessageId && (
                  <div>
                    <span className="font-medium">Email ID:</span>
                    <span className="ml-2 text-muted-foreground font-mono text-xs">
                      {job.emailMessageId}
                    </span>
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