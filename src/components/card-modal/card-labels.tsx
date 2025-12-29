'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Plus, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface CardLabelsProps {
  cardId: string
  boardId: string
  cardLabels: Array<{ id: string; name: string; color: string }>
  boardLabels: Array<{ id: string; name: string; color: string }>
  showPicker?: boolean
  onOpenPicker?: () => void
  onClosePicker?: () => void
  hideDisplay?: boolean
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#344563',
]

export function CardLabelPicker({ 
  cardId, 
  boardId, 
  cardLabels, 
  boardLabels,
  onClose
}: {
  cardId: string
  boardId: string
  cardLabels: Array<{ id: string; name: string; color: string }>
  boardLabels: Array<{ id: string; name: string; color: string }>
  onClose?: () => void
}) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  const isCreatingState = React.useState(false)
  const [isCreating, setIsCreating] = isCreatingState
  const [newLabelName, setNewLabelName] = React.useState('')
  const [newLabelColor, setNewLabelColor] = React.useState(PRESET_COLORS[0])

  const assignedIds = new Set(cardLabels.map((l) => l.id))

  const addLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const res = await fetch(`/api/cards/${cardId}/labels/${labelId}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Erro ao adicionar label')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError: () => {
      addToast('error', 'Erro ao adicionar label')
    },
  })

  const removeLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const res = await fetch(`/api/cards/${cardId}/labels/${labelId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao remover label')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError: () => {
      addToast('error', 'Erro ao remover label')
    },
  })

  const createLabelMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch(`/api/boards/${boardId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) throw new Error('Erro ao criar label')
      return res.json()
    },
    onSuccess: (newLabel) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      // Auto-assign the new label
      addLabelMutation.mutate(newLabel.id)
      setIsCreating(false)
      setNewLabelName('')
    },
    onError: () => {
      addToast('error', 'Erro ao criar label')
    },
  })

  const handleToggleLabel = (labelId: string) => {
    if (assignedIds.has(labelId)) {
      removeLabelMutation.mutate(labelId)
    } else {
      addLabelMutation.mutate(labelId)
    }
  }

  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault()
    if (newLabelName.trim()) {
      createLabelMutation.mutate({ name: newLabelName.trim(), color: newLabelColor })
    }
  }

  return (
    <div className="w-72 bg-popover rounded-lg shadow-xl border border-border/60 p-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Etiquetas</h4>
        {onClose && (
          <button onClick={onClose}>
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Existing Labels */}
      <div className="space-y-1 mb-3">
        {boardLabels.map((label) => {
          const colorLower = label.color.toLowerCase()
          const isDarkColor = ['#344563', '#000000', '#1a1a1a', '#0f0f0f', '#111111'].includes(colorLower) || colorLower.startsWith('#1') || colorLower.startsWith('#2') || colorLower.startsWith('#3')
          return (
            <button
              key={label.id}
              onClick={() => handleToggleLabel(label.id)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span
                className={cn(
                  "flex-1 h-8 rounded flex items-center px-3 text-white text-sm font-medium",
                  isDarkColor && "ring-1 ring-inset ring-white/20"
                )}
                style={{ 
                  backgroundColor: label.color,
                  boxShadow: isDarkColor ? 'inset 0 0 0 1px rgba(255,255,255,0.2)' : undefined
                }}
              >
                {label.name}
              </span>
              {assignedIds.has(label.id) && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </button>
          )
        })}
      </div>

      {/* Create New Label */}
      {isCreating ? (
        <form onSubmit={handleCreateLabel} className="space-y-2">
          <Input
            placeholder="Nome da label"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            autoFocus
          />
          <div className="flex flex-wrap gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewLabelColor(color)}
                className={cn(
                  'w-8 h-8 rounded',
                  newLabelColor === color && 'ring-2 ring-offset-2 ring-blue-500'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" type="submit" isLoading={createLabelMutation.isPending}>
              Criar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          + Criar nova etiqueta
        </button>
      )}
    </div>
  )
}

export function CardLabels({ 
  cardId, 
  boardId, 
  cardLabels, 
  boardLabels,
  showPicker: controlledShowPicker,
  onOpenPicker,
  onClosePicker,
  hideDisplay
}: CardLabelsProps) {
  const [internalShowPicker, setInternalShowPicker] = React.useState(false)

  const showPicker = controlledShowPicker !== undefined ? controlledShowPicker : internalShowPicker
  const setShowPicker = (val: boolean) => {
    if (controlledShowPicker !== undefined) {
      if (val && onOpenPicker) onOpenPicker()
      if (!val && onClosePicker) onClosePicker()
    } else {
      setInternalShowPicker(val)
    }
  }

  if (hideDisplay) {
    return showPicker ? (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
        <div className="relative z-20">
          <div className="absolute right-0 top-0 z-50">
            <CardLabelPicker
              cardId={cardId}
              boardId={boardId}
              cardLabels={cardLabels}
              boardLabels={boardLabels}
              onClose={() => setShowPicker(false)}
            />
          </div>
        </div>
      </>
    ) : null
  }

  return (
    <div>
      {/* Assigned Labels */}
      {cardLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {cardLabels.map((label) => {
            const colorLower = label.color.toLowerCase()
            const isDarkColor = ['#344563', '#000000', '#1a1a1a', '#0f0f0f', '#111111'].includes(colorLower) || colorLower.startsWith('#1') || colorLower.startsWith('#2') || colorLower.startsWith('#3')
            return (
              <span
                key={label.id}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium text-white",
                  isDarkColor && "ring-1 ring-inset ring-white/20"
                )}
                style={{ 
                  backgroundColor: label.color,
                  boxShadow: isDarkColor ? 'inset 0 0 0 1px rgba(255,255,255,0.2)' : undefined
                }}
              >
                {label.name}
              </span>
            )
          })}
          {!onOpenPicker && (
            <button
              onClick={() => setShowPicker(true)}
              className="px-2 py-1 rounded text-xs bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {cardLabels.length === 0 && !onOpenPicker && (
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-foreground"
        >
          <Tag className="h-4 w-4" />
          Adicionar etiqueta
        </button>
      )}

      {/* Label Picker */}
      {showPicker && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
          <div className="relative z-20">
            <div className="absolute left-0 top-2 z-50">
              <CardLabelPicker
                cardId={cardId}
                boardId={boardId}
                cardLabels={cardLabels}
                boardLabels={boardLabels}
                onClose={() => setShowPicker(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
