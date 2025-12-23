'use client'

import * as React from 'react'
import { MoreHorizontal, ChevronRight, ArrowLeft, Plus, Trash2, X, Check, Copy, ArrowRight as ArrowRightIcon, Tag } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ColumnActionsMenuProps {
  columnId: string
  boardId: string
  onRename: () => void
}

type MenuView = 'main' | 'sort' | 'automation'

export function ColumnActionsMenu({ columnId, boardId, onRename }: ColumnActionsMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [view, setView] = React.useState<MenuView>('main')
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [showMoveListModal, setShowMoveListModal] = React.useState(false)
  const [showMoveAllCardsModal, setShowMoveAllCardsModal] = React.useState(false)
  
  // Automation Modals
  const [showAutoMoveModal, setShowAutoMoveModal] = React.useState(false)
  const [showAutoCopyModal, setShowAutoCopyModal] = React.useState(false)
  const [showAutoLabelModal, setShowAutoLabelModal] = React.useState(false)
  
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // --- Data & Mutations ---

  const { data: automations = [] } = useQuery({
      queryKey: ['column-automations', columnId],
      queryFn: async () => {
          const res = await fetch(`/api/columns/${columnId}/automation`)
          if (!res.ok) throw new Error('Erro ao carregar automações')
          return res.json()
      },
      enabled: isOpen && view === 'automation'
  })

  const deleteAutomationMutation = useMutation({
      mutationFn: async (id: string) => {
          const res = await fetch(`/api/columns/${columnId}/automation?id=${id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Falha ao excluir automação')
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['column-automations', columnId] })
          addToast('success', 'Automação removida')
      },
      onError: () => addToast('error', 'Erro ao remover automação')
  })

  const deleteColumnMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/columns/${columnId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao excluir')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Coluna excluída')
      setIsOpen(false)
    },
    onError: () => addToast('error', 'Erro ao excluir coluna')
  })

  const copyListMutation = useMutation({
    mutationFn: async () => {
       const res = await fetch(`/api/columns/${columnId}/copy`, { method: 'POST' })
       if (!res.ok) throw new Error('Falha ao copiar')
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['board', boardId] })
       addToast('success', 'Lista copiada')
       setIsOpen(false)
    },
    onError: () => addToast('error', 'Erro ao copiar lista')
  })

  const sortCardsMutation = useMutation({
      mutationFn: async (criteria: string) => {
          const res = await fetch(`/api/columns/${columnId}/cards/sort`, {
              method: 'POST',
              body: JSON.stringify({ criteria })
          })
          if (!res.ok) throw new Error('Falha ao ordenar')
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['board', boardId] })
          addToast('success', 'Cartões ordenados')
          setIsOpen(false)
      },
      onError: () => addToast('error', 'Erro ao ordenar')
  })

  // --- Render Views ---

  const renderMainView = () => (
    <div className="py-1">
      <button onClick={() => { setIsOpen(false); onRename() }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        Renomear
      </button>
      <button onClick={() => copyListMutation.mutate()} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        Copiar lista
      </button>
      <button onClick={() => { setIsOpen(false); setShowMoveListModal(true) }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        Mover lista
      </button>
      <button onClick={() => { setIsOpen(false); setShowMoveAllCardsModal(true) }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        Mover todos os cartões desta lista
      </button>
      
      <div className="my-1 border-t border-border/50" />
      
      <button onClick={() => setView('sort')} className="w-full flex items-center justify-between px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        <span>Ordenar por...</span>
        <ChevronRight className="h-4 w-4" />
      </button>
      
      <button onClick={() => setView('automation')} className="w-full flex items-center justify-between px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        <span>Automação</span>
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="my-1 border-t border-border/50" />

      <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
        Excluir coluna
      </button>
    </div>
  )

  const renderSortView = () => (
    <div className="py-1">
      <div className="flex items-center px-4 py-2 border-b border-border/50 mb-1">
        <button onClick={() => setView('main')} className="mr-2 hover:bg-secondary/50 rounded p-0.5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-center flex-1 pr-6">Ordenar lista</span>
      </div>
      <button onClick={() => sortCardsMutation.mutate('created_desc')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        Data de criação (mais recente)
      </button>
      <button onClick={() => sortCardsMutation.mutate('created_asc')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        Data de criação (mais antigo)
      </button>
      <button onClick={() => sortCardsMutation.mutate('name_asc')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        Nome do cartão (A-Z)
      </button>
      <button onClick={() => sortCardsMutation.mutate('due_date')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">
        Data de entrega
      </button>
    </div>
  )

  const renderAutomationView = () => {
    // Helper to get description
    const getDesc = (a: any) => {
        if (a.type === 'ADD_LABEL') return 'Adicionar etiqueta'
        if (a.type === 'MOVE_TO_COLUMN') return 'Mover para outra lista'
        if (a.type === 'COPY_TO_COLUMN') return 'Copiar para outra lista'
        return a.type
    }

    return (
     <div className="py-1">
      <div className="flex items-center px-4 py-2 border-b border-border/50 mb-1">
        <button onClick={() => setView('main')} className="mr-2 hover:bg-secondary/50 rounded p-0.5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-center flex-1 pr-6">Automação</span>
      </div>
      
      <div className="px-4 py-2 text-xs text-muted-foreground bg-secondary/20 mx-2 rounded mb-2">
        <p className="font-medium mb-1">Gatilho:</p>
        <p>Quando um cartão for adicionado a esta lista...</p>
      </div>

      <div className="max-h-48 overflow-y-auto">
          {automations.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-2 border-b border-border/40 last:border-0 hover:bg-secondary/30">
                  <div className="flex items-center gap-2 text-sm">
                      {a.type === 'ADD_LABEL' && <Tag className="h-3 w-3 text-blue-500" />}
                      {a.type === 'MOVE_TO_COLUMN' && <ArrowRightIcon className="h-3 w-3 text-orange-500" />}
                      {a.type === 'COPY_TO_COLUMN' && <Copy className="h-3 w-3 text-green-500" />}
                      <span className="truncate max-w-[140px]">{getDesc(a)}</span>
                  </div>
                  <button 
                    onClick={() => deleteAutomationMutation.mutate(a.id)}
                    className="text-muted-foreground hover:text-red-500 p-1"
                  >
                      <Trash2 className="h-3.5 w-3.5" />
                  </button>
              </div>
          ))}
          {automations.length === 0 && (
              <div className="px-4 py-3 text-center text-xs text-muted-foreground italic">
                  Nenhuma automação configurada
              </div>
          )}
      </div>

      <div className="p-2 border-t border-border/50 mt-1">
          <div className="text-xs font-semibold mb-2 px-2">Adicionar ação:</div>
          <div className="grid grid-cols-1 gap-1">
              <button onClick={() => { setIsOpen(false); setShowAutoMoveModal(true) }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded text-left">
                  <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                  Mover cartão para...
              </button>
              <button onClick={() => { setIsOpen(false); setShowAutoCopyModal(true) }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded text-left">
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  Copiar cartão para...
              </button>
              <button onClick={() => { setIsOpen(false); setShowAutoLabelModal(true) }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded text-left">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Adicionar etiqueta...
              </button>
          </div>
      </div>
    </div>
  )}

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); setView('main') }}
        className="p-1 hover:bg-background/50 text-muted-foreground hover:text-foreground rounded transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-72 bg-popover rounded-lg shadow-xl border border-border/60 z-20 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
             {view === 'main' && renderMainView()}
             {view === 'sort' && renderSortView()}
             {view === 'automation' && renderAutomationView()}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setIsOpen(false) }}
        onConfirm={() => deleteColumnMutation.mutate()}
        title="Excluir coluna?"
        description="Essa ação apagará a coluna e todos os cartões dentro dela. Não pode ser desfeita."
        confirmText="Excluir"
        isLoading={deleteColumnMutation.isPending}
      />
      
      {/* --- Feature Modals --- */}
      <MoveAllCardsModal 
         isOpen={showMoveAllCardsModal} 
         onClose={() => setShowMoveAllCardsModal(false)}
         columnId={columnId}
         boardId={boardId}
      />
      
      <MoveListModal
         isOpen={showMoveListModal}
         onClose={() => setShowMoveListModal(false)}
         columnId={columnId}
         currentBoardId={boardId}
      />

      {/* --- Automation Modals --- */}
      <AutomationMoveCopyModal
         isOpen={showAutoMoveModal}
         onClose={() => setShowAutoMoveModal(false)}
         columnId={columnId}
         boardId={boardId}
         type="MOVE_TO_COLUMN"
      />
      <AutomationMoveCopyModal
         isOpen={showAutoCopyModal}
         onClose={() => setShowAutoCopyModal(false)}
         columnId={columnId}
         boardId={boardId}
         type="COPY_TO_COLUMN"
      />
      <AutomationLabelModal
         isOpen={showAutoLabelModal}
         onClose={() => setShowAutoLabelModal(false)}
         columnId={columnId}
         boardId={boardId}
      />
    </div>
  )
}

function MoveAllCardsModal({ isOpen, onClose, columnId, boardId }: { isOpen: boolean, onClose: () => void, columnId: string, boardId: string }) {
    const { addToast } = useToast()
    const queryClient = useQueryClient()
    const [targetColumnId, setTargetColumnId] = React.useState('')

    const { data: board } = useQuery({
        queryKey: ['board-summary', boardId],
        queryFn: async () => (await fetch(`/api/boards/${boardId}`)).json(),
        enabled: isOpen
    })

    const columns = board?.columns || []
    
    // Set default target
    React.useEffect(() => {
        if (columns.length > 0 && !targetColumnId) {
            setTargetColumnId(columns[0].id)
        }
    }, [columns, targetColumnId])

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/columns/${columnId}/cards/move-all`, {
                method: 'POST',
                body: JSON.stringify({ targetColumnId })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao mover cartões')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', boardId] })
            addToast('success', 'Cartões movidos')
            onClose()
        },
        onError: (err: Error) => addToast('error', err.message)
    })

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader onClose={onClose}>Mover todos os cartões</ModalHeader>
            <ModalContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Para Coluna</label>
                        <select 
                           className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm"
                           value={targetColumnId}
                           onChange={e => setTargetColumnId(e.target.value)}
                        >
                           {columns.map((c: any) => (
                               <option key={c.id} value={c.id} disabled={c.id === columnId}>
                                   {c.title}{c.id === columnId ? ' (atual)' : ''}
                               </option>
                           ))}
                        </select>
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>Mover todos</Button>
            </ModalFooter>
        </Modal>
    )
}

function MoveListModal({ isOpen, onClose, columnId, currentBoardId }: { isOpen: boolean, onClose: () => void, columnId: string, currentBoardId: string }) {
    const { addToast } = useToast()
    const queryClient = useQueryClient()
    const [targetBoardId, setTargetBoardId] = React.useState(currentBoardId)
    const [position, setPosition] = React.useState(1)

    // Fetch user boards
    const { data: boards } = useQuery({
        queryKey: ['user-boards'],
        queryFn: async () => (await fetch('/api/boards')).json(),
        enabled: isOpen
    })

    // Fetch target board details to know column count
    const { data: targetBoard } = useQuery({
        queryKey: ['board-summary', targetBoardId],
        queryFn: async () => (await fetch(`/api/boards/${targetBoardId}`)).json(),
        enabled: isOpen && !!targetBoardId
    })

    // Determine max position
    const colCount = targetBoard?.columns?.length || 0
    const maxPos = targetBoardId === currentBoardId ? colCount : colCount + 1
    
    const mutation = useMutation({
        mutationFn: async () => {
             const res = await fetch(`/api/columns/${columnId}/move`, {
                method: 'POST',
                body: JSON.stringify({ targetBoardId, position })
            })
            if (!res.ok) throw new Error('Erro ao mover lista')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', currentBoardId] })
            if (targetBoardId !== currentBoardId) {
                queryClient.invalidateQueries({ queryKey: ['board', targetBoardId] })
            }
            addToast('success', 'Lista movida')
            onClose()
        },
        onError: () => addToast('error', 'Erro ao mover lista')
    })
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader onClose={onClose}>Mover Lista</ModalHeader>
            <ModalContent>
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Quadro</label>
                        <select 
                           className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm"
                           value={targetBoardId}
                           onChange={e => setTargetBoardId(e.target.value)}
                        >
                           {boards?.map((b: any) => (
                               <option key={b.id} value={b.id}>{b.name}</option>
                           ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Posição</label>
                        <select 
                           className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm"
                           value={position}
                           onChange={e => setPosition(Number(e.target.value))}
                        >
                           {Array.from({ length: maxPos }, (_, i) => i + 1).map(p => (
                               <option key={p} value={p}>{p}</option>
                           ))}
                        </select>
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>Mover</Button>
            </ModalFooter>
        </Modal>
    )
}

function AutomationMoveCopyModal({ 
    isOpen, onClose, columnId, boardId, type 
}: { 
    isOpen: boolean, onClose: () => void, columnId: string, boardId: string, type: 'MOVE_TO_COLUMN' | 'COPY_TO_COLUMN' 
}) {
    const { addToast } = useToast()
    const queryClient = useQueryClient()
    const [targetBoardId, setTargetBoardId] = React.useState(boardId)
    const [targetColumnId, setTargetColumnId] = React.useState('')

    // Fetch user boards
    const { data: boards } = useQuery({
        queryKey: ['user-boards'],
        queryFn: async () => (await fetch('/api/boards')).json(),
        enabled: isOpen
    })

    // Fetch target board details to get columns
    const { data: targetBoard } = useQuery({
        queryKey: ['board-summary-auto', targetBoardId],
        queryFn: async () => (await fetch(`/api/boards/${targetBoardId}`)).json(),
        enabled: isOpen && !!targetBoardId
    })

    const columns = targetBoard?.columns || []
    
    React.useEffect(() => {
        if (columns.length > 0) {
            setTargetColumnId(columns[0].id)
        }
    }, [columns])

    const mutation = useMutation({
        mutationFn: async () => {
             const res = await fetch(`/api/columns/${columnId}/automation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    payload: { targetColumnId, targetBoardId }
                })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao salvar automação')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['column-automations', columnId] })
            addToast('success', 'Automação criada')
            onClose()
        },
        onError: (err) => addToast('error', err.message || 'Erro ao salvar automação')
    })
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader onClose={onClose}>{type === 'MOVE_TO_COLUMN' ? 'Automação: Mover Cartão' : 'Automação: Copiar Cartão'}</ModalHeader>
            <ModalContent>
                 <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Sempre que um cartão entrar nesta lista, ele será {type === 'MOVE_TO_COLUMN' ? 'movido' : 'copiado'} para:
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Para o Quadro</label>
                        <select 
                           className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm"
                           value={targetBoardId}
                           onChange={e => setTargetBoardId(e.target.value)}
                        >
                           {boards?.map((b: any) => (
                               <option key={b.id} value={b.id}>{b.name}</option>
                           ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Para a Coluna</label>
                        <select 
                           className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm"
                           value={targetColumnId}
                           onChange={e => setTargetColumnId(e.target.value)}
                        >
                           {columns.map((c: any) => (
                               <option key={c.id} value={c.id}>{c.title}</option>
                           ))}
                        </select>
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>Criar regra</Button>
            </ModalFooter>
        </Modal>
    )
}

function AutomationLabelModal({ 
    isOpen, onClose, columnId, boardId
}: { 
    isOpen: boolean, onClose: () => void, columnId: string, boardId: string
}) {
    const { addToast } = useToast()
    const queryClient = useQueryClient()
    const [selectedLabelId, setSelectedLabelId] = React.useState('')

    // Fetch board details to get labels
    const { data: board } = useQuery({
        queryKey: ['board-summary-labels', boardId],
        queryFn: async () => (await fetch(`/api/boards/${boardId}`)).json(),
        enabled: isOpen
    })

    const labels = board?.labels || []
    
    React.useEffect(() => {
        if (labels.length > 0 && !selectedLabelId) {
            setSelectedLabelId(labels[0].id)
        }
    }, [labels, selectedLabelId])

    const mutation = useMutation({
        mutationFn: async () => {
             const res = await fetch(`/api/columns/${columnId}/automation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'ADD_LABEL',
                    payload: { labelId: selectedLabelId }
                })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao salvar automação')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['column-automations', columnId] })
            addToast('success', 'Automação criada')
            onClose()
        },
        onError: (err) => addToast('error', err.message)
    })
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader onClose={onClose}>Automação: Adicionar Etiqueta</ModalHeader>
            <ModalContent>
                 <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Sempre que um cartão entrar nesta lista, atribuir a etiqueta:
                    </div>
                    <div className="space-y-2">
                         {labels.map((l: any) => (
                             <button
                                key={l.id}
                                onClick={() => setSelectedLabelId(l.id)}
                                className={cn(
                                    "w-full flex items-center justify-between p-2 rounded border border-transparent hover:bg-secondary",
                                    selectedLabelId === l.id && "bg-secondary border-primary/50"
                                )}
                             >
                                 <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: l.color }}>
                                     {l.name}
                                 </span>
                                 {selectedLabelId === l.id && <Check className="h-4 w-4 text-primary" />}
                             </button>
                         ))}
                         {labels.length === 0 && <div className="text-xs text-muted-foreground p-2">Nenhuma etiqueta disponível no quadro.</div>}
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!selectedLabelId}>Criar regra</Button>
            </ModalFooter>
        </Modal>
    )
}

