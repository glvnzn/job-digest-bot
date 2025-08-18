'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  useEffect(() => {
    // Update API client with auth token whenever session changes
    console.log('🔄 AuthProvider: Session updated', { 
      hasSession: !!session, 
      hasApiToken: !!(session as any)?.apiToken,
      apiTokenPreview: (session as any)?.apiToken ? `${(session as any).apiToken.substring(0, 20)}...` : null
    });
    
    if (session?.apiToken) {
      console.log('✅ AuthProvider: Setting auth token on API client');
      apiClient.setAuthToken(session.apiToken as string)
    } else {
      console.log('❌ AuthProvider: No API token, clearing auth');
      apiClient.setAuthToken(null)
    }
  }, [session])

  return <>{children}</>
}