import { useQuery } from '@tanstack/react-query'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  avatarKey?: string | null
  createdAt: string
  updatedAt: string
}

export function useCurrentUser(initialData?: any) {
  return useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await fetch('/api/me')
      if (!response.ok) {
        throw new Error('Falha ao carregar dados do usuário')
      }
      return response.json()
    },
    initialData: initialData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
