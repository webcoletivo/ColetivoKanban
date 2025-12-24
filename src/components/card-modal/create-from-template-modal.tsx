'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Input } from '@/components/ui/input'


interface CreateFromTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  cardId: string
  boardId: string
  currentColumnId: string
  templateTitle: string
}

export function CreateFromTemplateModal({
  isOpen,
  onClose,
  cardId,
  boardId,
  currentColumnId,
  templateTitle
}: CreateFromTemplateModalProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  const [selectedColumnId, setSelectedColumnId] = React.useState(currentColumnId)
  const [position, setPosition] = React.useState<'first' | 'last'>('last')
  const [title, setTitle] = React.useState(templateTitle)

  // Fetch columns for the current board
  const { data: boardData, isLoading: isLoadingBoard } = useQuery({
    queryKey: ['board-summary', boardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}`)
      if (!res.ok) throw new Error('Erro ao carregar colunas')
      return res.json()
    },
    enabled: Boolean(isOpen && boardId)
  })

  // Set default column if needed
  React.useEffect(() => {
    if (boardData?.columns?.length > 0 && !selectedColumnId) {
      setSelectedColumnId(boardData.columns[0].id)
    }
  }, [boardData, selectedColumnId])

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${cardId}/create-from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId: selectedColumnId,
          position: position,
          title: title.trim() || templateTitle
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar cartão a partir do template')
      }
      return res.json()
    },
    onSuccess: (newCard) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Cartão criado com sucesso')
      onClose()
    },
    onError: (err: Error) => {
      addToast('error', err.message)
    }
  })

  const columns = boardData?.columns || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        Criar cartão a partir de template
      </ModalHeader>
      <ModalContent className="space-y-4">
        {/* Title Input */}
        <div className="space-y-2">
          <label htmlFor="card-title" className="text-xs font-bold uppercase text-muted-foreground">Título do novo cartão</label>
          <Input 
            id="card-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
            placeholder="Título do cartão"
          />
        </div>

        {/* Column Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Coluna</label>
          <select 
            value={selectedColumnId}
            onChange={(e) => setSelectedColumnId(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoadingBoard}
          >
            {columns.map((c: any) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Position Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Posição</label>
          <select 
            value={position}
            onChange={(e) => setPosition(e.target.value as 'first' | 'last')}
            className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="first">Topo da lista</option>
            <option value="last">Base da lista</option>
          </select>
        </div>

      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={() => createMutation.mutate()} 
          isLoading={createMutation.isPending}
          disabled={createMutation.isPending || !selectedColumnId}
        >
          Criar cartão
        </Button>
      </ModalFooter>
    </Modal>
  )
}
