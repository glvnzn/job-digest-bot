'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { apiClient } from '@libs/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  useEffect(() => {
    // Update API client with auth token whenever session changes
    if (session?.apiToken) {
      apiClient.setAuthToken(session.apiToken as string)
    } else {
      apiClient.setAuthToken(null)
    }
  }, [session])

  return <>{children}</>
}