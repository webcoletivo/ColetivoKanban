'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface BoardSummary {
  id: string
  name: string
}

interface CardActionModalProps {
  isOpen: boolean
  onClose: () => void
  cardId: string
  currentBoardId: string
  currentColumnId: string
  type: 'move' | 'copy'
}

export function CardActionModal({
  isOpen,
  onClose,
  cardId,
  currentBoardId,
  currentColumnId,
  type
}: CardActionModalProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [selectedBoardId, setSelectedBoardId] = React.useState(currentBoardId)
  const [selectedColumnId, setSelectedColumnId] = React.useState(currentColumnId)
  const [selectedPositionIndex, setSelectedPositionIndex] = React.useState(1)

  // Fetch all boards where user is a member
  const { data: boards } = useQuery<BoardSummary[]>({
    queryKey: ['user-boards'],
    queryFn: async () => {
      const res = await fetch('/api/boards')
      if (!res.ok) throw new Error('Erro ao carregar quadros')
      return res.json()
    },
    enabled: Boolean(isOpen)
  })

  // Fetch columns for the selected board
  const { data: boardData, isLoading: isLoadingBoard } = useQuery({
    queryKey: ['board-summary', selectedBoardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${selectedBoardId}`)
      if (!res.ok) throw new Error('Erro ao carregar colunas')
      return res.json()
    },
    enabled: Boolean(isOpen && selectedBoardId)
  })

  const columns = boardData?.columns || []
  const targetColumn = columns.find((c: any) => c.id === selectedColumnId)
  const targetCards = targetColumn?.cards || []
  
  // Filter out the current card if we are moving within the same column
  const isMovingInSameColumn = type === 'move' && selectedColumnId === currentColumnId && selectedBoardId === currentBoardId
  const filteredCards = isMovingInSameColumn 
    ? targetCards.filter((c: any) => c.id !== cardId)
    : targetCards

  const maxPosition = type === 'move' 
    ? (isMovingInSameColumn ? targetCards.length : targetCards.length + 1)
    : targetCards.length + 1

  // Handle column/board changes
  React.useEffect(() => {
    if (columns.length > 0) {
      const exists = columns.some((c: any) => c.id === selectedColumnId)
      if (!exists) {
        setSelectedColumnId(columns[0].id)
      }
    }
  }, [columns, selectedColumnId])

  // Reset/Adjust position index when column or board changes
  React.useEffect(() => {
    if (isOpen && boardData) {
      // Default to last position for new columns, or current position for same column
      if (isMovingInSameColumn) {
        const currentIndex = targetCards.findIndex((c: any) => c.id === cardId) + 1
        setSelectedPositionIndex(currentIndex > 0 ? currentIndex : maxPosition)
      } else {
        setSelectedPositionIndex(maxPosition || 1)
      }
    }
  }, [selectedColumnId, selectedBoardId, !!boardData, isOpen])

  const actionMutation = useMutation({
    mutationFn: async () => {
      let position: number
      
      if (selectedPositionIndex === 1) {
        position = filteredCards.length > 0 ? filteredCards[0].position / 2 : 65536
      } else if (selectedPositionIndex >= filteredCards.length + 1) {
        position = filteredCards.length > 0 ? filteredCards[filteredCards.length - 1].position + 65536 : 65536
      } else {
        const prevCard = filteredCards[selectedPositionIndex - 2]
        const nextCard = filteredCards[selectedPositionIndex - 1]
        position = (prevCard.position + nextCard.position) / 2
      }

      const endpoint = type === 'move' ? `/api/cards/${cardId}/move` : `/api/cards/${cardId}/copy`
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          boardId: selectedBoardId,
          columnId: selectedColumnId, 
          position 
        }),
      })

      if (!res.ok) throw new Error(`Erro ao ${type === 'move' ? 'mover' : 'copiar'} cartão`)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', currentBoardId] })
      if (selectedBoardId !== currentBoardId) {
        queryClient.invalidateQueries({ queryKey: ['board', selectedBoardId] })
      }
      addToast('success', `Cartão ${type === 'move' ? 'movido' : 'copiado'} com sucesso`)
      onClose()
    },
    onError: (err: Error) => {
      addToast('error', err.message)
    }
  })

  const positionOptions = Array.from({ length: Math.max(1, maxPosition) }, (_, i) => i + 1)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        {type === 'move' ? 'Mover cartão' : 'Copiar cartão'}
      </ModalHeader>
      <ModalContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Quadro</label>
          <select 
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {boards?.map(b => (
              <option key={b.id} value={b.id}>{b.name}{b.id === currentBoardId ? ' (atual)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Coluna</label>
            <select 
              value={selectedColumnId}
              onChange={(e) => setSelectedColumnId(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoadingBoard}
            >
              {columns.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}{c.id === currentColumnId ? ' (atual)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Posição</label>
            <select 
              value={selectedPositionIndex}
              onChange={(e) => setSelectedPositionIndex(Number(e.target.value))}
              className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {positionOptions.map(pos => (
                <option key={pos} value={pos}>{pos}{isMovingInSameColumn && pos === targetCards.findIndex((c: any) => c.id === cardId) + 1 ? ' (atual)' : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={() => actionMutation.mutate()} 
          isLoading={actionMutation.isPending}
        >
          {type === 'move' ? 'Mover' : 'Criar cartão'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
