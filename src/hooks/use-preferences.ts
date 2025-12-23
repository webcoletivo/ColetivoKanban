import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export interface UserPreferences {
  id: string
  theme: 'light' | 'dark' | 'system'
  timezone: string
  emailInvitesEnabled: boolean
  notificationsEnabled: boolean
  language: string
  userId: string
}

export function usePreferences() {
  const queryClient = useQueryClient()

  const query = useQuery<UserPreferences>({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      const response = await fetch('/api/me/preferences')
      if (!response.ok) {
        throw new Error('Falha ao carregar configurações')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const mutation = useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const response = await fetch('/api/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Falha ao salvar configurações')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userPreferences'], data)
      // Special handling for theme
      if (data.theme) {
        applyTheme(data.theme)
      }
    },
  })

  // Sync theme on initial load
  useEffect(() => {
    if (query.data?.theme) {
      applyTheme(query.data.theme)
    }
  }, [query.data?.theme])

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: mutation.mutate,
    isUpdating: mutation.isPending,
  }
}

function applyTheme(theme: string) {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
    return
  }

  root.classList.add(theme)
}
