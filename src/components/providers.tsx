'use client'

import * as React from 'react'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
