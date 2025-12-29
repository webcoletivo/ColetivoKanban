import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/toast'
import { arrayMove } from '@dnd-kit/sortable'

interface BoardEvent {
  type: string
  payload: any
}

interface MovePayload {
  cardId: string
  columnId: string
  position: number
  boardId: string
  moverId: string
  updatedAt: string
}

export function useBoardEvents(boardId: string) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { addToast } = useToast()

  useEffect(() => {
    if (!boardId || !session?.user) return

    const eventSource = new EventSource(`/api/boards/${boardId}/events`)

    eventSource.onopen = () => {
      console.log('SSE Connected to board:', boardId)
    }

    eventSource.onmessage = (event) => {
      try {
        const data: BoardEvent = JSON.parse(event.data)

        // Handle card moved event
        if (data.type === 'card.moved') {
          const payload = data.payload as MovePayload
          
          // Ignore updates from self to prevent staggering/conflicts with optimistic updates
          if (payload.moverId === session.user.id) return

          console.log('Received real-time update:', payload)

          queryClient.setQueryData(['board', boardId], (old: any) => {
            if (!old) return old

            // Deep clone to avoid mutating state directly
            const newColumns = old.columns.map((col: any) => ({
              ...col,
              cards: [...col.cards]
            }))

            let movedCard: any = null
            let sourceColumnIndex = -1
            let cardIndex = -1

            // 1. Find and remove card from source column
            for (let i = 0; i < newColumns.length; i++) {
              const col = newColumns[i]
              const idx = col.cards.findIndex((c: any) => c.id === payload.cardId)
              if (idx !== -1) {
                movedCard = col.cards[idx]
                col.cards.splice(idx, 1) // Remove from old position
                sourceColumnIndex = i
                cardIndex = idx
                break
              }
            }

            if (!movedCard) return old // Card not found currently

            // Update card data
            movedCard = { ...movedCard, position: payload.position, updatedAt: payload.updatedAt }

            // 2. Add to target column
            const targetColumn = newColumns.find((c: any) => c.id === payload.columnId)
            if (targetColumn) {
              // Insert at correct position based on 'position' field
              // We need to find where to insert to keep order
              // Since sorting relies on position, we can just push and let the sorter handle it?
              // No, UI renders by array order usually.
              
              // Simple strategy: push and sort by position
              targetColumn.cards.push(movedCard)
              targetColumn.cards.sort((a: any, b: any) => a.position - b.position)
            }

            return {
              ...old,
              columns: newColumns
            }
          })
        }

      } catch (err) {
        console.error('Error parsing SSE event:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err)
      eventSource.close()
      // Retry logic is often handled by browser, but we can manually retry if needed
    }

    return () => {
      eventSource.close()
    }
  }, [boardId, session?.user, queryClient])
}
