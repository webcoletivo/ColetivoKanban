'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GripVertical } from 'lucide-react'
import { CardPreview } from './card-preview'
import { ColumnActionsMenu } from './column-actions-menu'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

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
}

interface ColumnProps {
  column: {
    id: string
    title: string
    position: number
    cards: Card[]
  }
  boardId: string
  onCardClick: (cardId: string) => void
  onCardContextMenu: (e: React.MouseEvent, cardId: string, cardRect: DOMRect) => void
  onCardQuickUpdate: (cardId: string, data: { title: string }) => void
  activeCardContextMenuId?: string | null
  editingCardId?: string | null
  onSetEditingCardId?: (cardId: string | null) => void
}

export function Column({ 
  column, 
  boardId, 
  onCardClick, 
  onCardContextMenu,
  onCardQuickUpdate,
  activeCardContextMenuId,
  editingCardId,
  onSetEditingCardId
}: ColumnProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  const [isEditing, setIsEditing] = React.useState(false)
  const [title, setTitle] = React.useState(column.title)
  // showMenu and showDeleteConfirm are removed as they are handled by ColumnActionsMenu
  const [isAddingCard, setIsAddingCard] = React.useState(false)
  const [newCardTitle, setNewCardTitle] = React.useState('')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', column },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const updateColumnMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const res = await fetch(`/api/columns/${column.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar coluna')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setIsEditing(false)
    },
    onError: () => {
      addToast('error', 'Erro ao atualizar coluna')
    },
  })

  const createCardMutation = useMutation({
    mutationFn: async (cardTitle: string) => {
      const res = await fetch(`/api/columns/${column.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cardTitle }),
      })
      if (!res.ok) throw new Error('Erro ao criar card')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setNewCardTitle('')
      setIsAddingCard(false)
    },
    onError: () => {
      addToast('error', 'Erro ao criar card')
    },
  })

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim() && title !== column.title) {
      updateColumnMutation.mutate(title.trim())
    } else {
      setIsEditing(false)
      setTitle(column.title)
    }
  }

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCardTitle.trim()) {
      createCardMutation.mutate(newCardTitle.trim())
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex-shrink-0 w-72 bg-muted/40 rounded-xl flex flex-col max-h-full border border-border/40',
        isDragging && 'opacity-50 ring-2 ring-primary rotate-2'
      )}
    >
      {/* Column Header */}
      <div 
        className="flex items-center justify-between p-3 pb-2 hover:bg-muted/60 rounded-t-xl transition-colors group"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="p-1 -ml-1 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing rounded transition-colors"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {isEditing ? (
            <form 
              onSubmit={handleTitleSubmit} 
              className="flex-1" 
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                // Prevent Backspace and other keys from triggering DnD listeners if they are bubbling
                e.stopPropagation()
              }}
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditing(false)
                  e.stopPropagation() // Isolate all key events
                }}
                onBlur={handleTitleSubmit}
                autoFocus
                className="w-full px-2 py-1 text-sm font-semibold bg-background rounded border border-ring focus:outline-none"
              />
            </form>
          ) : (
            <h3 
              className="font-semibold text-foreground truncate cursor-pointer px-2 py-1 rounded hover:bg-background/50 transition-colors flex-1"
              onClick={(e) => {
                e.stopPropagation() // Prevent accidental drag triggers
                setIsEditing(true)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {column.title}
            </h3>
          )}
        </div>

        {/* Column Menu */}
        <div className="relative">
          <ColumnActionsMenu 
             columnId={column.id} 
             boardId={boardId} 
             onRename={() => setIsEditing(true)} 
          />
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-2 pt-0 space-y-2">
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map((card) => (
            <CardPreview
              key={card.id}
              boardId={boardId}
              columnId={column.id}
              card={card}
              onClick={() => onCardClick(card.id)}
              onContextMenu={onCardContextMenu}
              onQuickUpdate={onCardQuickUpdate}
              isActive={activeCardContextMenuId === card.id}
              isEditing={editingCardId === card.id}
              onSetEditing={(editing) => onSetEditingCardId?.(editing ? card.id : null)}
            />
          ))}
        </SortableContext>

        {/* Add Card Form/Button */}
        {isAddingCard ? (
          <form onSubmit={handleCreateCard} className="bg-background rounded-lg p-2 shadow-sm border border-border/60">
            <textarea
              placeholder="Título do cartão..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleCreateCard(e)
                }
                if (e.key === 'Escape') {
                  setIsAddingCard(false)
                  setNewCardTitle('')
                }
              }}
              autoFocus
              rows={2}
              className="w-full px-2 py-1.5 text-sm bg-transparent resize-none focus:outline-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={!newCardTitle.trim() || createCardMutation.isPending}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCard(false)
                  setNewCardTitle('')
                }}
                className="px-3 py-1.5 text-muted-foreground text-sm font-medium hover:bg-secondary/50 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full p-2 text-left text-sm text-muted-foreground hover:bg-background/60 hover:text-foreground rounded-lg transition-all"
          >
            + Adicionar cartão
          </button>
        )}
      </div>
    </div>
  )
}
