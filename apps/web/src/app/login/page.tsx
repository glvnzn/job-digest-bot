'use client';

import { signIn, getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from 'next/navigation';
import { Chrome, Mail } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showDevLogin, setShowDevLogin] = useState(process.env.NODE_ENV === 'development');
  const router = useRouter();

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/jobs');
      }
    });
  }, [router]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    try {
      const result = await signIn('dev-login', { 
        email,
        callbackUrl: '/jobs',
        redirect: true 
      });
      if (result?.error) {
        console.error('Dev login error:', result.error);
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { 
        callbackUrl: '/jobs',
        redirect: true 
      });
    } catch (error) {
      console.error('Google sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your personalized job dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Development Login - Only show in development */}
          {showDevLogin && (
            <div className="space-y-4">
              <form onSubmit={handleDevLogin} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Development)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full" 
                  disabled={isLoading || !email}
                  size="lg"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isLoading ? 'Signing in...' : 'Dev Login'}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
            </div>
          )}

          {/* Google OAuth */}
          <Button 
            onClick={handleGoogleSignIn}
            className="w-full" 
            disabled={isLoading}
            variant="outline"
            size="lg"
          >
            <Chrome className="mr-2 h-4 w-4" />
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>
          
          {/* Development Mode Info - Only show in development */}
          {showDevLogin && (
            <div className="mt-6 p-4 border rounded-lg bg-muted">
              <h3 className="text-sm font-medium mb-2">Development Mode</h3>
              <p className="text-xs text-muted-foreground">
                Use dev login for quick testing or Google OAuth for full authentication.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}