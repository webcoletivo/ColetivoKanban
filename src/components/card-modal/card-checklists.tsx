'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Plus, Trash2, Square, Check, Calendar, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface ChecklistItem {
  id: string
  text: string
  dueAt: string | null
  isCompleted: boolean
  position: number
}

interface Checklist {
  id: string
  title: string
  position: number
  items: ChecklistItem[]
}

interface CardChecklistsProps {
  cardId: string
  boardId: string
  checklists: Checklist[]
  isCreating?: boolean
  onOpenCreating?: () => void
  onCloseCreating?: () => void
  hideDisplay?: boolean
}

export function CardChecklists({ 
  cardId, 
  boardId, 
  checklists,
  isCreating: controlledIsCreating,
  onOpenCreating,
  onCloseCreating,
  hideDisplay
}: CardChecklistsProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [internalIsCreating, setInternalIsCreating] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')

  const isCreating = controlledIsCreating !== undefined ? controlledIsCreating : internalIsCreating
  const setIsCreating = (val: boolean) => {
    if (controlledIsCreating !== undefined) {
      if (val && onOpenCreating) onOpenCreating()
      if (!val && onCloseCreating) onCloseCreating()
    } else {
      setInternalIsCreating(val)
    }
  }

  const createChecklistMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`/api/cards/${cardId}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error('Erro ao criar checklist')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setIsCreating(false)
      setNewTitle('')
    },
    onError: () => {
      addToast('error', 'Erro ao criar checklist')
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTitle.trim()) {
      createChecklistMutation.mutate(newTitle.trim())
    }
  }

  if (hideDisplay) {
    return isCreating ? (
      <form onSubmit={handleCreate} className="space-y-2 absolute right-0 top-0 w-72 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-3 z-20">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-gray-500" />
          <Input
            placeholder="Título do checklist"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex gap-2 ml-7">
          <Button size="sm" type="submit" isLoading={createChecklistMutation.isPending}>
            Adicionar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    ) : null
  }

  return (
    <div className="space-y-4">
      {checklists.map((checklist) => (
        <ChecklistComponent
          key={checklist.id}
          checklist={checklist}
          cardId={cardId}
          boardId={boardId}
        />
      ))}

      {/* Create Checklist */}
      {isCreating ? (
        <form onSubmit={handleCreate} className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-gray-500" />
            <Input
              placeholder="Título do checklist"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2 ml-7">
            <Button size="sm" type="submit" isLoading={createChecklistMutation.isPending}>
              Adicionar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : !onOpenCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <CheckSquare className="h-4 w-4" />
          Adicionar checklist
        </button>
      ) : null}
    </div>
  )
}

function ChecklistComponent({
  checklist,
  cardId,
  boardId,
}: {
  checklist: Checklist
  cardId: string
  boardId: string
}) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isAddingItem, setIsAddingItem] = React.useState(false)
  const [newItemText, setNewItemText] = React.useState('')
  const [showDeleteChecklistConfirm, setShowDeleteChecklistConfirm] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null)
  // Due date state
  const [dueDateItem, setDueDateItem] = React.useState<string | null>(null)
  const [dueDateValue, setDueDateValue] = React.useState('')
  const [dueTimeValue, setDueTimeValue] = React.useState('')

  const completedCount = checklist.items.filter((i) => i.isCompleted).length
  const totalCount = checklist.items.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const deleteChecklistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/checklists/${checklist.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao excluir checklist')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setShowDeleteChecklistConfirm(false)
    },
    onError: () => {
      addToast('error', 'Erro ao excluir checklist')
    },
  })

  const addItemMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/checklists/${checklist.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Erro ao adicionar item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setNewItemText('')
      setIsAddingItem(false)
    },
    onError: () => {
      addToast('error', 'Erro ao adicionar item')
    },
  })

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      const res = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao excluir item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const updateDueDateMutation = useMutation({
    mutationFn: async ({ itemId, dueAt }: { itemId: string; dueAt: string | null }) => {
      const res = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueAt }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar data')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setDueDateItem(null)
      setDueDateValue('')
      setDueTimeValue('')
    },
    onError: () => {
      addToast('error', 'Erro ao atualizar data')
    },
  })

  const openDueDatePopover = (item: ChecklistItem) => {
    setDueDateItem(item.id)
    if (item.dueAt) {
      const date = new Date(item.dueAt)
      // Use local time for both date and time inputs
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      setDueDateValue(`${year}-${month}-${day}`)
      setDueTimeValue(`${hours}:${minutes}`)
    } else {
      setDueDateValue('')
      setDueTimeValue('')
    }
  }

  const handleSaveDueDate = (itemId: string) => {
    if (!dueDateValue) {
      addToast('error', 'Selecione uma data')
      return
    }
    // Parse local date and time, then convert to ISO string
    const [year, month, day] = dueDateValue.split('-').map(Number)
    const [hours, minutes] = dueTimeValue ? dueTimeValue.split(':').map(Number) : [23, 59]
    const localDate = new Date(year, month - 1, day, hours, minutes, 0)
    const isoString = localDate.toISOString()
    updateDueDateMutation.mutate({ itemId, dueAt: isoString })
  }

  const handleRemoveDueDate = (itemId: string) => {
    updateDueDateMutation.mutate({ itemId, dueAt: null })
  }

  const formatDueDate = (dueAt: string) => {
    const date = new Date(dueAt)
    const now = new Date()
    const isOverdue = date < now
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return { formatted: `${day}/${month} ${hours}:${minutes}`, isOverdue }
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (newItemText.trim()) {
      addItemMutation.mutate(newItemText.trim())
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">{checklist.title}</h3>
        </div>
        <button
          onClick={() => setShowDeleteChecklistConfirm(true)}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 w-8">{Math.round(progress)}%</span>
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              progress === 100 ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1 ml-7">
        {checklist.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group relative">
            <button
              onClick={() => toggleItemMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
              className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                item.isCompleted
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 hover:border-blue-500'
              )}
            >
              {item.isCompleted && <Check className="h-3 w-3 text-white" />}
            </button>
            <span className={cn(
              'flex-1 text-sm',
              item.isCompleted && 'line-through text-gray-400'
            )}>
              {item.text}
            </span>
            
            {/* Due date display */}
            {item.dueAt && (
              <button
                onClick={() => openDueDatePopover(item)}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors',
                  formatDueDate(item.dueAt).isOverdue && !item.isCompleted
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : item.isCompleted
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                )}
              >
                <Clock className="h-3 w-3" />
                {formatDueDate(item.dueAt).formatted}
              </button>
            )}
            
            {/* Due date button */}
            <button
              onClick={() => openDueDatePopover(item)}
              className={cn(
                'p-1 text-gray-400 hover:text-blue-500 transition-all',
                !item.dueAt && 'opacity-0 group-hover:opacity-100'
              )}
              title="Definir data e hora"
            >
              <Calendar className="h-3 w-3" />
            </button>
            
            {/* Delete button */}
            <button
              onClick={() => setItemToDelete(item.id)}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            
            {/* Due date popover */}
            {dueDateItem === item.id && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 w-60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Data e hora</span>
                  <button
                    onClick={() => setDueDateItem(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data</label>
                    <input
                      type="date"
                      value={dueDateValue}
                      onChange={(e) => setDueDateValue(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hora</label>
                    <input
                      type="time"
                      value={dueTimeValue}
                      onChange={(e) => setDueTimeValue(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveDueDate(item.id)}
                      isLoading={updateDueDateMutation.isPending}
                      className="flex-1"
                    >
                      Salvar
                    </Button>
                    {item.dueAt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveDueDate(item.id)}
                        disabled={updateDueDateMutation.isPending}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        <ConfirmDialog
          isOpen={showDeleteChecklistConfirm}
          onClose={() => setShowDeleteChecklistConfirm(false)}
          onConfirm={() => deleteChecklistMutation.mutate()}
          title="Excluir checklist?"
          description="Essa ação remove a checklist e todos os itens. Não pode ser desfeita."
          confirmText="Excluir"
          isLoading={deleteChecklistMutation.isPending}
        />

        <ConfirmDialog
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={() => itemToDelete && deleteItemMutation.mutate(itemToDelete)}
          title="Excluir item?"
          description="Deseja excluir este item do checklist? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          isLoading={deleteItemMutation.isPending}
        />

        {/* Add Item */}
        {isAddingItem ? (
          <form onSubmit={handleAddItem} className="space-y-2">
            <Input
              placeholder="Adicionar item..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" type="submit" isLoading={addItemMutation.isPending}>
                Adicionar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingItem(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingItem(true)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            + Adicionar item
          </button>
        )}
      </div>
    </div>
  )
}
