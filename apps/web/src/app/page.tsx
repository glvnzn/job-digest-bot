'use client';

import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Index() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/jobs');
    }
  }, [status, router]);

  // Remove the loading check to show the landing page immediately

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Job Digest Platform
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            AI-powered job discovery and application tracking. Get personalized job recommendations delivered to your inbox.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/login">
              Get Started
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <div className="p-6 border rounded-lg bg-card text-card-foreground">
            <h3 className="text-lg font-semibold mb-2">🤖 AI-Powered Matching</h3>
            <p className="text-sm text-muted-foreground">
              Our AI analyzes your skills and preferences to find the most relevant job opportunities.
            </p>
          </div>
          <div className="p-6 border rounded-lg bg-card text-card-foreground">
            <h3 className="text-lg font-semibold mb-2">📧 Email Integration</h3>
            <p className="text-sm text-muted-foreground">
              Automatically processes job emails from your inbox and extracts relevant opportunities.
            </p>
          </div>
          <div className="p-6 border rounded-lg bg-card text-card-foreground">
            <h3 className="text-lg font-semibold mb-2">🔒 Secure Authentication</h3>
            <p className="text-sm text-muted-foreground">
              {process.env.NODE_ENV === 'development' 
                ? 'Sign in securely with Google OAuth or use development login for quick testing.'
                : 'Sign in securely with Google OAuth for full authentication.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}