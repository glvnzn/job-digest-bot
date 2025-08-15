'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryProvider } from './query-provider'

export function AppProviders({
  children,
  session,
}: {
  children: React.ReactNode
  session?: any
}) {
  return (
    <SessionProvider session={session}>
      <QueryProvider>
        {children}
      </QueryProvider>
    </SessionProvider>
  )
}