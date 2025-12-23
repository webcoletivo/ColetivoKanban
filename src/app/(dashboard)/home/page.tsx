'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, LayoutGrid, Clock, Users, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { AvatarGroup } from '@/components/ui/avatar'
import { BoardCardSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { cn, formatDate } from '@/lib/utils'
import { CreateBoardPopover } from '@/components/board/CreateBoardPopover'
import { ImportTrelloModal } from '@/components/board/ImportTrelloModal'

interface Board {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  cardCount: number
  backgroundImageUrl: string | null
  members: Array<{
    id: string
    name: string
    avatarUrl: string | null
    role: string
  }>
  myRole: string
}

async function fetchBoards(): Promise<Board[]> {
  const res = await fetch('/api/boards')
  if (!res.ok) throw new Error('Erro ao carregar boards')
  return res.json()
}

export default function HomePage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showImportModal, setShowImportModal] = React.useState(false)
  const [newBoardName, setNewBoardName] = React.useState('')
  const [boardToDelete, setBoardToDelete] = React.useState<Board | null>(null)

  const { data: boards, isLoading, error } = useQuery({
    queryKey: ['boards'],
    queryFn: fetchBoards,
  })

  // ... (keep createBoardMutation, deleteBoardMutation, handleCreateBoard)

  const createBoardMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar board')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      setShowCreateModal(false)
      setNewBoardName('')
      addToast('success', 'Board criado com sucesso!')
    },
    onError: (error: Error) => {
      addToast('error', error.message)
    },
  })

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao excluir board')
      }
      // 204 No Content
      return
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      setBoardToDelete(null)
      addToast('success', 'Quadro excluído')
    },
    onError: (error: Error) => {
      addToast('error', error.message)
    },
  })

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault()
    if (newBoardName.trim()) {
      createBoardMutation.mutate(newBoardName.trim())
    }
  }

  const handleDeleteClick = (board: Board) => {
    setBoardToDelete(board)
  }

  const confirmDelete = () => {
    if (boardToDelete) {
      deleteBoardMutation.mutate(boardToDelete.id)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Meus Boards
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize seus projetos com boards estilo Kanban
          </p>
        </div>
        <CreateBoardPopover 
          onCreateClick={() => setShowCreateModal(true)} 
          onImportClick={() => setShowImportModal(true)} 
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <BoardCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">Erro ao carregar boards. Tente novamente.</p>
        </div>
      )}

      {/* Empty State */}
      {boards && boards.length === 0 && (
        <Card className="p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <LayoutGrid className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum board ainda
          </h3>
          <p className="text-muted-foreground mb-6">
            Crie seu primeiro board para começar a organizar seus projetos
          </p>
          <CreateBoardPopover 
            onCreateClick={() => setShowCreateModal(true)} 
            onImportClick={() => setShowImportModal(true)} 
          />
        </Card>
      )}

      {/* Boards Grid */}
      {boards && boards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map((board) => (
            <BoardCard 
              key={board.id} 
              board={board} 
              onDelete={() => handleDeleteClick(board)}
            />
          ))}
        </div>
      )}

      {/* Import Modal */}
      <ImportTrelloModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
      />

      {/* Create Board Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalHeader onClose={() => setShowCreateModal(false)}>
          Criar novo board
        </ModalHeader>
        <form onSubmit={handleCreateBoard}>
          <ModalContent>
            <Input
              label="Nome do board"
              placeholder="Ex: Projeto Website, Tarefas Sprint 1..."
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              autoFocus
              required
            />
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={createBoardMutation.isPending}
              disabled={!newBoardName.trim()}
            >
              Criar board
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Board Modal */}
      <Modal isOpen={!!boardToDelete} onClose={() => setBoardToDelete(null)}>
        <ModalHeader onClose={() => setBoardToDelete(null)}>
          Excluir quadro?
        </ModalHeader>
        <ModalContent>
          <div className="text-sm text-muted-foreground">
            <p className="mb-4">
              Essa ação apagará o quadro <strong>{boardToDelete?.name}</strong> e todos os dados dentro dele (colunas, cards, checklists, anexos, comentários, atividades e membros).
            </p>
            <p className="font-semibold text-red-500">
              Essa ação não pode ser desfeita.
            </p>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setBoardToDelete(null)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirmDelete}
            isLoading={deleteBoardMutation.isPending}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

function BoardCard({ board, onDelete }: { board: Board; onDelete: () => void }) {
  return (
    <Link href={`/boards/${board.id}`}>
      <Card 
        className={cn(
          "h-48 p-4 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden border-border/60 hover:border-primary/50",
          board.backgroundImageUrl ? "bg-cover bg-center" : "bg-card"
        )}
        style={board.backgroundImageUrl ? { backgroundImage: `url(${board.backgroundImageUrl})` } : undefined}
      >
        {/* Overlay for background images */}
        {board.backgroundImageUrl && (
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
        )}

        <div className="relative z-10 h-full flex flex-col">
          {/* Header (Role & Delete) */}
          <div className="flex justify-between items-start mb-2">
            <div>
              {board.myRole === 'ADMIN' && (
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block mb-1",
                  board.backgroundImageUrl 
                    ? "bg-white/20 text-white border-white/30 backdrop-blur-sm" 
                    : "bg-primary/10 text-primary border-primary/20"
                )}>
                  Admin
                </span>
              )}
            </div>
            
            {board.myRole === 'ADMIN' && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2",
                  board.backgroundImageUrl 
                    ? "text-white hover:bg-white/20 hover:text-white" 
                    : "text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                )}
                onClick={(e) => {
                  e.preventDefault() // Prevent navigation
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Board Name */}
          <h3 className={cn(
            "font-bold text-lg mb-auto transition-colors tracking-tight line-clamp-2",
            board.backgroundImageUrl ? "text-white" : "text-foreground group-hover:text-primary"
          )}>
            {board.name}
          </h3>
  
          {/* Stats & Members */}
          <div className="mt-auto">
            <div className={cn(
              "flex items-center gap-4 text-xs mb-3 font-medium",
              board.backgroundImageUrl ? "text-white/80" : "text-muted-foreground"
            )}>
              <div className="flex items-center gap-1">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>{board.cardCount} cards</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDate(board.updatedAt)}</span>
              </div>
            </div>
  
            <div className="flex items-center justify-between">
              <AvatarGroup
                avatars={board.members.map((m) => ({
                  src: m.avatarUrl,
                  name: m.name,
                }))}
                max={4}
                size="sm"
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
