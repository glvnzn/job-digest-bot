'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  description: string;
  applyUrl: string;
  salary: string | null;
  relevanceScore: number;
  createdAt: string;
}

interface JobsResponse {
  success: boolean;
  data: Job[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    count: number;
  };
}

export default function JobsPage() {
  const { data: session, status } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchJobs();
    }
  }, [status, router]);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3333/api/v1/jobs?limit=20');
      const data: JobsResponse = await response.json();

      if (data.success) {
        setJobs(data.data);
      } else {
        setError('Failed to fetch jobs');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-destructive">{error}</div>
          <Button onClick={fetchJobs}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Job Digest Platform</h1>
            {session?.user && (
              <p className="text-sm text-muted-foreground">
                Welcome, {session.user.name || session.user.email}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Available Jobs</h2>
            <p className="text-muted-foreground">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Button onClick={fetchJobs} variant="outline">
            Refresh
          </Button>
        </div>

        <div className="grid gap-6">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span>{job.company}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                      {job.isRemote && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary">Remote</Badge>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge 
                      variant={formatScore(job.relevanceScore) >= 80 ? "default" : "secondary"}
                    >
                      {formatScore(job.relevanceScore)}% Match
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {(job.description || job.salary) && (
                <CardContent>
                  {job.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {job.description.slice(0, 200)}
                      {job.description.length > 200 ? '...' : ''}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    {job.salary && (
                      <div className="text-sm font-medium">
                        {job.salary}
                      </div>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/jobs/${job.id}`}>
                          View Details
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <a 
                          href={job.applyUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Apply
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              There are currently no job opportunities available.
            </p>
            <Button onClick={fetchJobs}>
              Refresh Jobs
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}