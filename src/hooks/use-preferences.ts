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
  })

  // No manual theme syncing here anymore.
  // next-themes handles the visual state, and SettingsForm handles the initial sync.

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: mutation.mutate,
    isUpdating: mutation.isPending,
  }
}
