'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MeasuringStrategy,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { BoardHeader } from '@/components/board/board-header'
import { Column } from '@/components/board/column'
import { CardPreview } from '@/components/board/card-preview'
import { CardModal } from '@/components/card-modal/card-modal'
import { BoardSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { generatePosition } from '@/lib/utils'
import { CardContextMenu } from '@/components/board/card-context-menu'
import { CardActionModal } from '@/components/board/card-action-modal'
import { CardQuickLabelsPopover } from '@/components/board/card-quick-labels-popover'
import { CardQuickDatesModal } from '@/components/board/card-quick-dates-modal'
import { CardCoverPopover } from '@/components/card-modal/card-cover-popover'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Card {
  id: string
  title: string
  description: string | null
  dueAt: string | null
  isCompleted: boolean
  position: number
  labels: Array<{ id: string; name: string; color: string }>
  checklistProgress: { total: number; completed: number }
  commentCount: number
  attachmentCount: number
  coverType: string | null
  coverColor: string | null
  coverImageUrl: string | null
  coverImageKey: string | null
  coverSize: string | null
  updatedAt: string 
}

interface ColumnData {
  id: string
  title: string
  position: number
  cards: Card[]
}

interface BoardData {
  id: string
  name: string
  ownerId: string
  myUserId: string
  myRole: string
  columns: ColumnData[]
  members: Array<{
    id: string
    name: string
    email: string
    avatarUrl: string | null
    avatarKey: string | null
    updatedAt: string 
    role: string
  }>
  labels: Array<{ id: string; name: string; color: string }>
  backgroundImageUrl: string | null
  backgroundImageKey: string | null
  updatedAt: string
}

import { getAssetUrl } from '@/lib/utils'

async function fetchBoard(boardId: string): Promise<BoardData> {
  const res = await fetch(`/api/boards/${boardId}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Board não encontrado')
    throw new Error('Erro ao carregar board')
  }
  return res.json()
}

import { useDraggableScroll } from '@/hooks/use-draggable-scroll'

export default function BoardPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const boardId = params.boardId as string

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeType, setActiveType] = React.useState<'column' | 'card' | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [contextMenu, setContextMenu] = React.useState<{ anchorRect: DOMRect, cardId: string } | null>(null)
  const [editingCardId, setEditingCardId] = React.useState<string | null>(null)
  const [actionModal, setActionModal] = React.useState<{ type: 'move' | 'copy', cardId: string, currentColumnId: string } | null>(null)
  const [cardToDelete, setCardToDelete] = React.useState<string | null>(null)
  const [quickLabels, setQuickLabels] = React.useState<{ cardId: string, anchorRect: DOMRect } | null>(null)
  const [quickDates, setQuickDates] = React.useState<string | null>(null)
  const [quickCover, setQuickCover] = React.useState<{ cardId: string, anchorRect: DOMRect } | null>(null)

  // Labels expanded state (Trello-style global toggle with persistence)
  const [labelsExpanded, setLabelsExpanded] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`board-${boardId}-labels-expanded`) === 'true'
    }
    return false
  })

  // Persist labels expanded state to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`board-${boardId}-labels-expanded`, String(labelsExpanded))
    }
  }, [labelsExpanded, boardId])

  const handleToggleLabelsExpanded = React.useCallback(() => {
    setLabelsExpanded(prev => !prev)
  }, [])

  // Scroll hook
  const { ref: scrollRef, handleMouseDown, isDragging } = useDraggableScroll()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // Require movement before drag starts
    }),
    useSensor(KeyboardSensor)
  )

  const { data: board, isLoading, error } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId),
  })

  // Mutations
  const moveCardMutation = useMutation({
    mutationFn: async ({ cardId, columnId, position }: { cardId: string; columnId: string; position: number }) => {
      const res = await fetch(`/api/cards/${cardId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, position }),
      })
      if (!res.ok) throw new Error('Erro ao mover cartão')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('error', 'Erro ao mover cartão')
    },
  })

  const updateColumnMutation = useMutation({
    mutationFn: async ({ columnId, position }: { columnId: string; position: number }) => {
      const res = await fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar coluna')
      return res.json()
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('error', 'Erro ao mover coluna')
    },
  })

  const updateCardMutation = useMutation({
    mutationFn: async ({ cardId, data }: { cardId: string, data: any }) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erro ao atualizar cartão')
      return res.json()
    },
    onMutate: async ({ cardId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] })
      const previousBoard = queryClient.getQueryData(['board', boardId])
      
      queryClient.setQueryData(['board', boardId], (old: BoardData | undefined) => {
        if (!old) return old
        return {
          ...old,
          columns: old.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) => 
              c.id === cardId ? { ...c, ...data } : c
            )
          }))
        }
      })
      
      return { previousBoard }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      queryClient.invalidateQueries({ queryKey: ['card', variables.cardId] })
    },
    onError: (err, _, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard)
      }
      addToast('error', 'Erro ao atualizar cartão')
    },
  })

  const archiveCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivedAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error('Erro ao arquivar cartão')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Cartão arquivado')
    },
  })

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao excluir cartão')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Cartão excluído permanentemente')
      setCardToDelete(null)
    },
    onError: () => {
      addToast('error', 'Erro ao excluir cartão')
    },
  })

  // Cover mutations
  const uploadCoverMutation = useMutation({
    mutationFn: async ({ cardId, file }: { cardId: string, file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/cards/${cardId}/cover`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao carregar imagem')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Capa atualizada')
    },
    onError: (err: Error) => {
      addToast('error', err.message)
    }
  })

  const removeCoverMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await fetch(`/api/cards/${cardId}/cover`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao remover capa')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Capa removida')
    },
    onError: (err: Error) => {
      addToast('error', err.message)
    }
  })

  const handleCardContextMenu = (e: React.MouseEvent, cardId: string, cardRect: DOMRect) => {
    e.preventDefault()
    setContextMenu({ anchorRect: cardRect, cardId })
    setEditingCardId(cardId)
  }

  const handleCardAction = (action: string, cardId: string) => {
    // Find column for the card
    let colId = ''
    if (board) {
      for (const col of board.columns) {
        if (col.cards.some(c => c.id === cardId)) {
          colId = col.id
          break
        }
      }
    }

    switch (action) {
      case 'open':
        setQuickCover(null)
        setSelectedCardId(cardId)
        setEditingCardId(null)
        break
      case 'archive':
        archiveCardMutation.mutate(cardId)
        setEditingCardId(null)
        break
      case 'delete':
        setCardToDelete(cardId)
        setEditingCardId(null)
        break
      case 'move':
        setActionModal({ type: 'move', cardId, currentColumnId: colId })
        setEditingCardId(null)
        break
      case 'copy':
        setActionModal({ type: 'copy', cardId, currentColumnId: colId })
        setEditingCardId(null)
        break
      case 'labels':
        if (contextMenu?.anchorRect) {
          setQuickLabels({ cardId, anchorRect: contextMenu.anchorRect })
        } else {
          // Fallback if context menu closed or not available
          const rect = document.querySelector(`[data-card-id="${cardId}"]`)?.getBoundingClientRect()
          if (rect) {
            setQuickLabels({ cardId, anchorRect: rect })
          }
        }
        setEditingCardId(null)
        break
      case 'dates':
        setQuickDates(cardId)
        setEditingCardId(null)
        break
      case 'cover':
        // Use the anchorRect from contextMenu (captured at right-click time)
        // This ensures the popover anchors to the card's position at click time
        if (contextMenu?.anchorRect) {
          setQuickCover({ cardId, anchorRect: contextMenu.anchorRect })
        } else {
          // Fallback: query the DOM if contextMenu isn't available
          const rect = document.querySelector(`[data-card-id="${cardId}"]`)?.getBoundingClientRect()
          if (rect) {
            setQuickCover({ cardId, anchorRect: rect })
          }
        }
        // Don't set editingCardId to null, keep the card focused
        break
    }
    setContextMenu(null)
  }

  const handleDismissFocus = () => {
    setContextMenu(null)
    setEditingCardId(null)
  }

  // Find active item for overlay
  const findActiveCard = React.useCallback(() => {
    if (!board || !activeId || activeType !== 'card') return null
    for (const column of board.columns) {
      const card = column.cards.find((c) => c.id === activeId)
      if (card) return card
    }
    return null
  }, [board, activeId, activeType])

  const findActiveColumn = React.useCallback(() => {
    if (!board || !activeId || activeType !== 'column') return null
    return board.columns.find((c) => c.id === activeId)
  }, [board, activeId, activeType])

  // Custom collision detection strategy
  const collisionDetectionStrategy = React.useCallback((args: any) => {
    const { active, droppableContainers, pointerCoordinates } = args
    if (!pointerCoordinates) return []

    // Determine active drag type
    const activeType = active.data.current?.type

    if (activeType === 'column') {
      const pointerCollisions = closestCorners(args)
      if (pointerCollisions.length > 0) {
        const firstCollision = pointerCollisions[0]
        if (firstCollision.data?.droppableContainer?.data?.current?.type === 'column') {
          return pointerCollisions
        }
        if (firstCollision.data?.droppableContainer?.data?.current?.type === 'card') {
          const cardColumnId = firstCollision.data?.droppableContainer?.data?.current?.columnId
          if (cardColumnId) {
            const columnContainer = droppableContainers.find((c: any) => c.id === cardColumnId)
            if (columnContainer) {
              return [{ id: columnContainer.id, data: columnContainer.data }]
            }
          }
        }
      }
      return pointerCollisions
    }

    // For cards, we want to find the column under the cursor first
    // especially if the column is empty
    const pointerCollisions = closestCorners(args)
    if (pointerCollisions.length > 0) {
      const firstCollision = pointerCollisions[0]
      
      // If we are over a column, or over a card in a column
      if (firstCollision.data?.droppableContainer?.data?.current?.type === 'column' || 
          firstCollision.data?.droppableContainer?.data?.current?.type === 'card') {
        return pointerCollisions
      }
    }

    return closestCorners(args)
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const type = active.data.current?.type as 'column' | 'card'
    setActiveId(active.id as string)
    setActiveType(type)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || !board) return

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    if (activeType !== 'card') return

    const activeCardId = active.id as string
    const overId = over.id as string

    // Find source column
    let sourceColumn: ColumnData | undefined
    let activeCard: Card | undefined
    for (const col of board.columns) {
      const card = col.cards.find((c) => c.id === activeCardId)
      if (card) {
        sourceColumn = col
        activeCard = card
        break
      }
    }

    if (!sourceColumn || !activeCard) return

    // Determine target column
    let targetColumn: ColumnData | undefined
    if (overType === 'column') {
      targetColumn = board.columns.find((c) => c.id === overId)
    } else if (overType === 'card') {
      for (const col of board.columns) {
        if (col.cards.find((c) => c.id === overId)) {
          targetColumn = col
          break
        }
      }
    }

    if (!targetColumn || sourceColumn.id === targetColumn.id) return

    // Optimistically move card to new column
    queryClient.setQueryData(['board', boardId], (old: BoardData) => {
      const newColumns = old.columns.map((col) => {
        if (col.id === sourceColumn!.id) {
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== activeCardId),
          }
        }
        if (col.id === targetColumn!.id) {
          return {
            ...col,
            cards: [...col.cards, activeCard!],
          }
        }
        return col
      })
      return { ...old, columns: newColumns }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setActiveType(null)

    if (!over || !board) return

    const activeType = active.data.current?.type
    const overId = over.id as string
    const activeItemId = active.id as string

    if (activeType === 'column') {
      // Reorder columns
      const oldIndex = board.columns.findIndex((c) => c.id === activeItemId)
      const newIndex = board.columns.findIndex((c) => c.id === overId)

      if (oldIndex !== newIndex) {
        const newColumns = arrayMove(board.columns, oldIndex, newIndex)
        
        // Calculate new position
        const prevPos = newIndex > 0 ? newColumns[newIndex - 1].position : undefined
        const nextPos = newIndex < newColumns.length - 1 ? newColumns[newIndex + 1].position : undefined
        const newPosition = generatePosition(prevPos, nextPos)

        // Optimistic update
        queryClient.setQueryData(['board', boardId], (old: BoardData) => ({
          ...old,
          columns: newColumns.map((col, i) => 
            col.id === activeItemId ? { ...col, position: newPosition } : col
          ),
        }))

        updateColumnMutation.mutate({ columnId: activeItemId, position: newPosition })
      }
    } else if (activeType === 'card') {
      // Find current column of the card
      let currentColumn: ColumnData | undefined
      let cardIndex = -1
      for (const col of board.columns) {
        const idx = col.cards.findIndex((c) => c.id === activeItemId)
        if (idx !== -1) {
          currentColumn = col
          cardIndex = idx
          break
        }
      }

      if (!currentColumn) return

      // Find over column and index
      let targetColumn: ColumnData | undefined
      let targetIndex = -1

      if (over.data.current?.type === 'column') {
        targetColumn = board.columns.find((c) => c.id === overId)
        targetIndex = targetColumn?.cards.length || 0
      } else {
        for (const col of board.columns) {
          const idx = col.cards.findIndex((c) => c.id === overId)
          if (idx !== -1) {
            targetColumn = col
            targetIndex = idx
            break
          }
        }
      }

      if (!targetColumn) return

      // Calculate new position
      const cards = targetColumn.cards
      let newPosition: number
      if (cards.length === 0) {
        newPosition = 65536
      } else if (targetIndex === 0) {
        newPosition = cards[0].position / 2
      } else if (targetIndex >= cards.length) {
        newPosition = cards[cards.length - 1].position + 65536
      } else {
        const prevPos = cards[targetIndex - 1].position
        const nextPos = cards[targetIndex].position
        newPosition = (prevPos + nextPos) / 2
      }

      moveCardMutation.mutate({
        cardId: activeItemId,
        columnId: targetColumn.id,
        position: newPosition,
      })

      // Optimistic update for reordering within same column
      if (currentColumn.id === targetColumn.id && cardIndex !== targetIndex) {
        queryClient.setQueryData(['board', boardId], (old: BoardData) => {
          const newColumns = old.columns.map((col) => {
            if (col.id === currentColumn!.id) {
              const newCards = arrayMove(col.cards, cardIndex, targetIndex)
              return { ...col, cards: newCards }
            }
            return col
          })
          return { ...old, columns: newColumns }
        })
      }
    }
  }


  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] p-6">
        <BoardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {(error as Error).message}
          </h2>
          <button
            onClick={() => router.push('/home')}
            className="text-blue-600 hover:underline"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    )
  }

  if (!board) return null

  const activeCard = findActiveCard()
  const activeColumn = findActiveColumn()

  const isFocusMode = !!contextMenu || !!editingCardId

  return (
    <div 
      className="h-[calc(100vh-64px)] flex flex-col relative bg-cover bg-center bg-no-repeat transition-all duration-700"
      style={board.backgroundImageKey || board.backgroundImageUrl ? { 
        backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url("${getAssetUrl(board.backgroundImageKey || board.backgroundImageUrl, board.updatedAt)}")` 
      } : undefined}
    >
      {/* Global Focus Backdrop */}
      {isFocusMode && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 animate-in fade-in duration-300" 
          onClick={(e) => {
            e.stopPropagation()
            handleDismissFocus()
          }}
        />
      )}
      <BoardHeader 
        board={{
          ...board,
          members: board.members.map(m => ({
            ...m,
            role: m.role as string
          })),
          backgroundImageUrl: board.backgroundImageUrl,
          backgroundImageKey: board.backgroundImageKey,
          updatedAt: board.updatedAt
        }} 
        onOpenCard={setSelectedCardId}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => {
             // Block context menu only if we are likely dragging or if right click is used for scroll
             // For now, let's block only if we are using right click drag logic
          }}
          className="flex-1 overflow-x-auto overflow-y-hidden p-4 select-none cursor-grab active:cursor-grabbing"
          style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        >
          <div className="flex gap-4 h-full w-max">
            <SortableContext
              items={board.columns.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {board.columns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  boardId={boardId}
                  onCardClick={(id) => {
                    handleDismissFocus()
                    setQuickCover(null)
                    setQuickLabels(null)
                    setSelectedCardId(id)
                  }}
                  onCardContextMenu={handleCardContextMenu}
                  onCardQuickUpdate={(cardId, data) => updateCardMutation.mutate({ cardId, data })}
                  activeCardContextMenuId={contextMenu?.cardId}
                  editingCardId={editingCardId}
                  onSetEditingCardId={setEditingCardId}
                  labelsExpanded={labelsExpanded}
                  onToggleLabelsExpanded={handleToggleLabelsExpanded}
                />
              ))}
            </SortableContext>

            {/* Add Column Button */}
            <AddColumnButton boardId={boardId} />
          </div>
        </div>

        <DragOverlay>
          {activeCard && (
            <CardPreview 
              card={activeCard} 
              isDragging
              boardId={boardId}
              columnId={activeCard.position ? "" : ""} // Not used in overlay but required by prop
            />
          )}
          {activeColumn && (
            <div className="w-72 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 opacity-80 shadow-xl border-2 border-blue-500">
              <h3 className="font-semibold">{activeColumn.title}</h3>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {contextMenu && (
        <CardContextMenu
          anchorRect={contextMenu.anchorRect}
          onClose={() => {
            setContextMenu(null)
            setEditingCardId(null)
          }}
          onAction={(action) => handleCardAction(action, contextMenu.cardId)}
          permissions={{
            canDelete: board.myRole === 'ADMIN' || (board as any).ownerId === (board as any).myUserId,
            canArchive: true,
          }}
        />
      )}

      {actionModal && (
        <CardActionModal
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          cardId={actionModal.cardId}
          currentBoardId={boardId}
          currentColumnId={actionModal.currentColumnId}
          type={actionModal.type}
        />
      )}

      <ConfirmDialog
        isOpen={!!cardToDelete}
        onClose={() => setCardToDelete(null)}
        onConfirm={() => cardToDelete && deleteCardMutation.mutate(cardToDelete)}
        title="Excluir cartão?"
        description="Essa ação é permanente e não pode ser desfeita."
        confirmText="Excluir"
        isLoading={deleteCardMutation.isPending}
      />

      {quickLabels && (
        <CardQuickLabelsPopover
          isOpen={!!quickLabels}
          onClose={() => setQuickLabels(null)}
          anchorRect={quickLabels.anchorRect}
          cardId={quickLabels.cardId}
          boardId={boardId}
          cardLabels={board.columns.flatMap(c => c.cards).find(c => c.id === quickLabels.cardId)?.labels || []}
          boardLabels={board.labels}
        />
      )}

      {quickDates && (
        <CardQuickDatesModal
          isOpen={!!quickDates}
          onClose={() => setQuickDates(null)}
          cardId={quickDates}
          currentDueAt={board.columns.flatMap(c => c.cards).find(c => c.id === quickDates)?.dueAt || null}
          onSave={(date) => {
            updateCardMutation.mutate({ cardId: quickDates, data: { dueAt: date } })
            setQuickDates(null)
          }}
          isLoading={updateCardMutation.isPending}
        />
      )}

      {quickCover && (
        <CardCoverPopover
          isOpen={!!quickCover}
          onClose={() => {
            setQuickCover(null)
            setEditingCardId(null)
          }}
          anchorRect={quickCover.anchorRect}
          cardId={quickCover.cardId}
          currentCover={{
            type: (board?.columns.flatMap(c => c.cards).find(c => c.id === quickCover.cardId) as any)?.coverType || 'none',
            color: (board?.columns.flatMap(c => c.cards).find(c => c.id === quickCover.cardId) as any)?.coverColor,
            imageUrl: (board?.columns.flatMap(c => c.cards).find(c => c.id === quickCover.cardId) as any)?.coverImageUrl,
            size: (board?.columns.flatMap(c => c.cards).find(c => c.id === quickCover.cardId) as any)?.coverSize || 'strip'
          }}
          onUpdate={(data) => {
            updateCardMutation.mutate({ cardId: quickCover.cardId, data })
          }}
          onUpload={(file) => {
            uploadCoverMutation.mutate({ cardId: quickCover.cardId, file })
          }}
          onRemove={() => {
            removeCoverMutation.mutate(quickCover.cardId)
          }}
          isUpdating={updateCardMutation.isPending || uploadCoverMutation.isPending || removeCoverMutation.isPending}
        />
      )}

      {/* Card Modal */}
      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          boardId={boardId}
          boardLabels={board.labels}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  )
}

function AddColumnButton({ boardId }: { boardId: string }) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isAdding, setIsAdding] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const createColumnMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error('Erro ao criar coluna')
      return res.json()
    },
    onSuccess: (newColumn) => {
      queryClient.setQueryData(['board', boardId], (old: BoardData) => ({
        ...old,
        columns: [...old.columns, newColumn],
      }))
      setTitle('')
      setIsAdding(false)
    },
    onError: () => {
      addToast('error', 'Erro ao criar coluna')
    },
  })

  React.useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus()
    }
  }, [isAdding])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      createColumnMutation.mutate(title.trim())
    }
  }

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex-shrink-0 w-72 h-12 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium transition-colors"
      >
        + Adicionar coluna
      </button>
    )
  }

  return (
    <div className="flex-shrink-0 w-72 bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Nome da coluna"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsAdding(false)
              setTitle('')
            }
          }}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={!title.trim() || createColumnMutation.isPending}
            className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Adicionar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false)
              setTitle('')
            }}
            className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
