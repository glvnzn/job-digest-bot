'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryProvider } from './query-provider'
import { AuthProvider } from './auth-provider'

export function AppProviders({
  children,
  session,
}: {
  children: React.ReactNode
  session?: any
}) {
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <QueryProvider>
          {children}
        </QueryProvider>
      </AuthProvider>
    </SessionProvider>
  )
}