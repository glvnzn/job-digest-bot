'use client';

export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react';
import { CareerInsights } from '@/components/career-insights';
import { AppHeader } from '@/components/layout/app-header';
import { Brain } from 'lucide-react';

export default function InsightsPage() {
  const { data: session, status } = useSession();

  // Remove aggressive auth check - middleware handles protection

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
      <AppHeader />

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