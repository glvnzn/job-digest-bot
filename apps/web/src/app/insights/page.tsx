'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CareerInsights } from '@/components/career-insights';
import { 
  Briefcase,
  Brain
} from 'lucide-react';

export default function InsightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 animate-pulse" />
          Loading insights...
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
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/jobs">Jobs</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/kanban">Kanban</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="bg-muted">
                <Link href="/insights">Career Insights</Link>
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
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Career Insights & Advisory</h1>
          <p className="text-lg text-muted-foreground">
            AI-powered analysis of job market trends and personalized career development recommendations
          </p>
        </div>

        <CareerInsights />
      </main>
    </div>
  );
}