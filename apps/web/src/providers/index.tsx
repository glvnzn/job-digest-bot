'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryProvider } from './query-provider'
import { AuthProvider } from './auth-provider'
import { NuqsProvider } from './nuqs-provider'
import { Toaster } from 'sonner'

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
          <NuqsProvider>
            {children}
            <Toaster position="top-right" />
          </NuqsProvider>
        </QueryProvider>
      </AuthProvider>
    </SessionProvider>
  )
}