'use client'

export const dynamic = 'force-dynamic';
 
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw } from 'lucide-react'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  const isAuthError = error.message.includes('Authentication') || 
                     error.message.includes('session') ||
                     error.message.includes('401') ||
                     error.message.includes('403');

  const handleSignIn = () => {
    window.location.href = '/login';
  };
 
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl font-semibold">
            {isAuthError ? 'Authentication Error' : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {isAuthError 
              ? 'There was a problem with authentication. Please try signing in again.'
              : 'An unexpected error occurred. Please try again.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 rounded-md bg-muted text-sm font-mono text-muted-foreground">
              {error.message}
            </div>
          )}
          
          <div className="flex gap-2">
            {isAuthError ? (
              <Button 
                onClick={handleSignIn}
                className="flex-1"
                variant="default"
              >
                Sign In Again
              </Button>
            ) : (
              <Button 
                onClick={reset}
                className="flex-1"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}