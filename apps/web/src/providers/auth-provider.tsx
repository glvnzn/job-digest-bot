'use client'

import { useSession, signOut, getSession } from 'next-auth/react'
import { useEffect } from 'react'
import { apiClient } from '@libs/api'
import { useRouter } from 'next/navigation'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Update API client with auth token whenever session changes
    if (session?.apiToken) {
      apiClient.setAuthToken(session.apiToken as string)
    } else {
      apiClient.setAuthToken(null)
    }

    // Set up automatic logout for API client
    apiClient.setAuthHandlers(
      async () => {
        await signOut({ redirect: false })
        router.push('/login')
      },
      async () => await getSession()
    )
  }, [session, router])

  return <>{children}</>
}