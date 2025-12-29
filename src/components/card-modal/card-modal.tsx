'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  X, Calendar, Tag, CheckSquare, Paperclip, MessageSquare, 
  Clock, MoreHorizontal, Trash2, Archive, Check, Plus, Image as ImageIcon,
  ArrowRight, Copy, LayoutTemplate
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { cn, formatDateTime, isOverdue, isDueToday, toLocalDateTimeString, getAssetUrl } from '@/lib/utils'
import { CardDescription } from './card-description'
import { CardLabels } from './card-labels'
import { CardChecklists } from './card-checklists'
import { CardAttachments } from './card-attachments'
import { CardComments } from './card-comments'
import { CardActivities } from './card-activities'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CardCoverPopover } from './card-cover-popover'
import { CardActionModal } from '@/components/board/card-action-modal'
import { CreateFromTemplateModal } from './create-from-template-modal'
import { useMutation as useReactMutation } from '@tanstack/react-query'


interface CardModalProps {
  cardId: string
  boardId: string
  boardLabels: Array<{ id: string; name: string; color: string }>
  onClose: () => void
}

interface CardData {
  id: string
  title: string
  description: string | null
  dueAt: string | null
  archivedAt: string | null
  isCompleted: boolean
  createdAt: string
  updatedAt: string 
  createdBy: { id: string; name: string }
  column: { id: string; title: string }
  labels: Array<{ id: string; name: string; color: string }>
  checklists: Array<{
    id: string
    title: string
    position: number
    items: Array<{
      id: string
      text: string
      dueAt: string | null
      isCompleted: boolean
      position: number
    }>
  }>
  attachments: Array<{
    id: string
    fileName: string
    fileSize: number
    mimeType: string
    createdAt: string
    uploadedBy: { id: string; name: string }
  }>
  comments: Array<{
    id: string
    content: string
    createdAt: string
    user: { id: string; name: string; avatarUrl: string | null }
  }>
  activities: Array<{
    id: string
    type: string
    payload: Record<string, unknown>
    createdAt: string
    actor: { id: string; name: string; avatarUrl: string | null } | null
  }>
  coverType: string | null
  coverColor: string | null
  coverImageUrl: string | null
  coverImageKey: string | null
  coverSize: string | null
  isTemplate: boolean
}

async function fetchCard(cardId: string): Promise<CardData> {
  const res = await fetch(`/api/cards/${cardId}`)
  if (!res.ok) throw new Error('Erro ao carregar cartão')
  return res.json()
}

export function CardModal({ cardId, boardId, boardLabels, onClose }: CardModalProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [activeAddPanel, setActiveAddPanel] = React.useState<'labels' | 'checklist' | 'dates' | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [showAddActions, setShowAddActions] = React.useState(false)
  const [coverAnchor, setCoverAnchor] = React.useState<DOMRect | null>(null)
  const [moreActionsAnchor, setMoreActionsAnchor] = React.useState<DOMRect | null>(null)
  const [actionModalType, setActionModalType] = React.useState<'move' | 'copy' | null>(null)
  const [showCreateFromTemplate, setShowCreateFromTemplate] = React.useState(false)


  const { data: card, isLoading } = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => fetchCard(cardId),
  })

  React.useEffect(() => {
    if (card) {
      setTitle(card.title)
    }
  }, [card])

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  const updateCardMutation = useMutation({
    mutationFn: async (data: Partial<any>) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao atualizar cartão')
      }
      return res.json()
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['card', cardId] })
      const previousCard = queryClient.getQueryData(['card', cardId])
      queryClient.setQueryData(['card', cardId], (old: any) => ({
        ...old,
        ...newData
      }))
      return { previousCard }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError: (err: Error, _, context: any) => {
      if (context?.previousCard) {
        queryClient.setQueryData(['card', cardId], context.previousCard)
      }
      addToast('error', err.message || 'Erro ao atualizar cartão')
    },
  })

  // Cover specific mutations
  const uploadCoverMutation = useMutation({
    mutationFn: async (file: File) => {
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
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Capa atualizada')
    },
    onError: (err: Error) => {
      addToast('error', err.message)
    }
  })

  const removeCoverMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${cardId}/cover`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao remover capa')
      return res.json()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['card', cardId] })
      const previousCard = queryClient.getQueryData(['card', cardId])
      queryClient.setQueryData(['card', cardId], (old: any) => ({
        ...old,
        coverType: 'none',
        coverColor: null,
        coverImageUrl: null
      }))
      return { previousCard }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Capa removida')
    },
    onError: (err: Error, _, context: any) => {
      if (context?.previousCard) {
        queryClient.setQueryData(['card', cardId], context.previousCard)
      }
      addToast('error', err.message)
    }
  })


  const deleteCardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir cartão')
      return res.json()
    },
    onMutate: async () => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['board', boardId] })
      
      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData(['board', boardId])
      
      // Optimistically update to the new value
      queryClient.setQueryData(['board', boardId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          columns: old.columns.map((col: any) => ({
            ...col,
            cards: col.cards.filter((c: any) => c.id !== cardId)
          }))
        }
      })

      onClose()
      
      return { previousBoard }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Cartão excluído permanentemente')
    },
    onError: (err, _, context: any) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard)
      }
      addToast('error', 'Erro ao excluir cartão')
    },
  })

  const archiveCardMutation = useMutation({
    mutationFn: async (archive: boolean) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivedAt: archive ? new Date().toISOString() : null }),
      })
      if (!res.ok) throw new Error(archive ? 'Erro ao arquivar cartão' : 'Erro ao desarquivar cartão')
      return res.json()
    },
    onMutate: async (archive) => {
      if (archive) {
        // Optimistic UI only for archiving (removing from board)
        await queryClient.cancelQueries({ queryKey: ['board', boardId] })
        const previousBoard = queryClient.getQueryData(['board', boardId])
        
        queryClient.setQueryData(['board', boardId], (old: any) => {
          if (!old) return old
          return {
            ...old,
            columns: old.columns.map((col: any) => ({
              ...col,
              cards: col.cards.filter((c: any) => c.id !== cardId)
            }))
          }
        })

        onClose()
        return { previousBoard }
      }
      return {}
    },
    onSuccess: (_, archive) => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      if (archive) {
        addToast('success', 'Cartão arquivado')
      } else {
        addToast('success', 'Cartão desarquivado')
      }
    },
    onError: (err, archive, context: any) => {
      if (archive && context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard)
      }
      addToast('error', archive ? 'Erro ao arquivar cartão' : 'Erro ao desarquivar cartão')
    },
  })

  const handleTitleSubmit = () => {
    if (title.trim() && title !== card?.title) {
      updateCardMutation.mutate({ title: title.trim() })
    }
    setIsEditingTitle(false)
  }

  const handleToggleComplete = () => {
    if (card) {
      updateCardMutation.mutate({ isCompleted: !card.isCompleted })
    }
  }

  const handleSetDueDate = (date: string | null) => {
    updateCardMutation.mutate({ dueAt: date })
    setActiveAddPanel(null)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 overflow-y-auto">
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-3xl bg-card rounded-xl shadow-2xl m-4 border border-border">
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4 bg-muted" />
            <Skeleton className="h-4 w-1/4 bg-muted" />
            <Skeleton className="h-32 w-full bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (!card) return null

  const hasDueDate = !!card.dueAt
  const overdue = hasDueDate && !card.isCompleted && isOverdue(card.dueAt!)
  const dueToday = hasDueDate && !card.isCompleted && isDueToday(card.dueAt!)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md transition-all duration-300" onClick={onClose} />

      {/* Modal */}
      {/* Modal - Fixed Dimensions: 1080px x 700px on Desktop */}
      <div className="relative w-full md:w-[1080px] h-full md:h-[700px] bg-background rounded-xl shadow-2xl mx-4 animate-in fade-in-0 zoom-in-95 border border-border flex flex-col overflow-hidden">
        
        {/* Template Banner */}
        {card.isTemplate && (
          <div className="w-full bg-blue-600 text-white px-4 py-3 flex items-center justify-between shrink-0 z-30 relative">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              <span className="font-semibold text-sm">Este é um template de cartão.</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="font-medium shadow-sm border-0"
              onClick={() => setShowCreateFromTemplate(true)}
            >
              Criar cartão com base em template
            </Button>
          </div>
        )}

        {/* Header Actions Area (Icons at Top Right) */}
        <div className={cn(
          "absolute right-4 flex items-center gap-1 z-20 transition-all duration-200",
          card.isTemplate ? "top-16" : "top-4"
        )}>
          {/* Cover Icon */}
          <button
            onClick={(e) => setCoverAnchor(e.currentTarget.getBoundingClientRect())}
            title="Capa"
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          {/* More Actions Icon */}
          <div className="relative">
            <button
              onClick={(e) => setMoreActionsAnchor(e.currentTarget.getBoundingClientRect())}
              title="Mais ações"
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {moreActionsAnchor && (
              <CardActionsMenuPopover
                anchorRect={moreActionsAnchor}
                isTemplate={card.isTemplate}
                onClose={() => setMoreActionsAnchor(null)}
                onAction={(type) => {
                   if (type === 'toggle-template') {
                     updateCardMutation.mutate({ isTemplate: !card.isTemplate })
                   } else {
                     setActionModalType(type as 'move' | 'copy')
                   }
                   setMoreActionsAnchor(null)
                }}
              />
            )}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Close Button */}
          <button
            onClick={onClose}
            title="Fechar"
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Card Cover Header */}
        {card.coverType && card.coverType !== 'none' && (card.coverColor || card.coverImageUrl || card.coverImageKey) && (
          <div  
            className="w-full h-32 md:h-40 shrink-0 relative bg-cover bg-center"
            style={{ 
              backgroundColor: card.coverType === 'color' ? card.coverColor || '#dfe1e6' : '#dfe1e6',
              backgroundImage: card.coverType === 'image' ? `url(${getAssetUrl(card.coverImageKey || card.coverImageUrl, card.updatedAt)})` : 'none',
            }}
          >
             {/* Small visual overlay if it's a light color for better close-button visibility */}
             <div className="absolute inset-0 bg-black/5" />
          </div>
        )}

        {/* Content Wrapper */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Column 1: Main Info - 620px */}
          <div className="w-full md:w-[620px] h-full overflow-y-auto p-8 border-b md:border-b-0 md:border-r border-border scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
            <div className="space-y-8 pr-2">
              {/* Header Section */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleTitleSubmit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSubmit()
                        if (e.key === 'Escape') {
                          setTitle(card.title)
                          setIsEditingTitle(false)
                        }
                      }}
                      autoFocus
                      className="w-full text-2xl font-bold bg-transparent border-b-2 border-primary focus:outline-none py-1"
                    />
                  ) : (
                    <h2
                      onClick={() => setIsEditingTitle(true)}
                      className={cn(
                        'text-2xl font-bold cursor-pointer hover:bg-secondary/50 px-2 py-1 -mx-2 rounded-lg transition-colors text-foreground tracking-tight w-fit',
                        card.isCompleted && 'line-through text-muted-foreground'
                      )}
                    >
                      {card.title}
                    </h2>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <p className="text-muted-foreground">
                      na lista <span className="font-medium text-foreground underline decoration-border underline-offset-2">{card.column.title}</span>
                    </p>
                    {card.archivedAt && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 uppercase tracking-wider">
                        <Archive className="h-3 w-3" />
                        Arquivado
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Row - Moved Here */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {/* Add Button & Popover */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAddActions(!showAddActions)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md transition-colors font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </button>
                    
                    {showAddActions && (
                      <AddActionsPopover
                        onClose={() => setShowAddActions(false)}
                        onAction={(action) => {
                          setActiveAddPanel(action)
                          setShowAddActions(false)
                        }}
                      />
                    )}

                    {activeAddPanel === 'dates' && (
                      <DatePickerPopover
                        value={card.dueAt}
                        onChange={handleSetDueDate}
                        onClose={() => setActiveAddPanel(null)}
                      />
                    )}
                  </div>

                  <div className="w-px h-6 bg-border mx-1" />

                  {card.archivedAt ? (
                    <>
                      <button
                        onClick={() => archiveCardMutation.mutate(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md transition-colors font-medium"
                        disabled={archiveCardMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                        Enviar para o board
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors font-medium"
                        disabled={deleteCardMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => archiveCardMutation.mutate(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md transition-colors font-medium"
                        disabled={archiveCardMutation.isPending}
                      >
                        <Archive className="h-4 w-4" />
                        Arquivar
                      </button>

                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors font-medium"
                        disabled={deleteCardMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Meta Section (Labels & Due Date) */}
              <div className="space-y-6">
                <CardLabels
                  cardId={cardId}
                  boardId={boardId}
                  cardLabels={card.labels}
                  boardLabels={boardLabels}
                  showPicker={activeAddPanel === 'labels'}
                  onOpenPicker={() => {
                    setActiveAddPanel('labels')
                    setShowAddActions(false)
                  }}
                  onClosePicker={() => setActiveAddPanel(null)}
                />

                {/* Due Date Display */}
                {hasDueDate && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de entrega</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleToggleComplete}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all shadow-sm border',
                          card.isCompleted 
                            ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                            : overdue 
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                              : 'bg-secondary/50 text-foreground border-border hover:bg-secondary'
                        )}
                      >
                        <div className={cn(
                          'w-4 h-4 border rounded flex items-center justify-center transition-colors',
                          card.isCompleted ? 'bg-green-600 border-green-600' : 'border-muted-foreground/40 bg-background'
                        )}>
                          {card.isCompleted && <Check className="h-3 w-3 text-white" />}
                        </div>
                        
                        <span>{formatDateTime(card.dueAt!)}</span>
                        
                        {card.isCompleted && <span className="ml-1.5 px-1.5 py-0.5 bg-green-200/50 dark:bg-green-800/50 rounded text-xs">Concluído</span>}
                        {overdue && !card.isCompleted && <span className="ml-1.5 px-1.5 py-0.5 bg-red-200/50 dark:bg-red-800/50 rounded text-xs">Atrasado</span>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <CardDescription
                cardId={cardId}
                boardId={boardId}
                description={card.description}
              />

              {/* Checklists */}
              <CardChecklists
                cardId={cardId}
                boardId={boardId}
                checklists={card.checklists}
                isCreating={activeAddPanel === 'checklist'}
                onOpenCreating={() => {
                  setActiveAddPanel('checklist')
                  setShowAddActions(false)
                }}
                onCloseCreating={() => setActiveAddPanel(null)}
              />

              {/* Attachments */}
              <CardAttachments
                cardId={cardId}
                boardId={boardId}
                attachments={card.attachments}
              />
            </div>
          </div>

          {/* Column 2: Sidebar (Comments & Activities) - 460px */}
          <div className="w-full md:w-[460px] h-full overflow-y-auto p-6 md:p-8 bg-muted/20 border-l border-border/50 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
            <div className="space-y-8">
              <CardComments
                cardId={cardId}
                boardId={boardId}
                comments={card.comments}
              />

              <div className="h-px bg-border/50 w-full" />

              <CardActivities 
                activities={card.activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())} 
              />
            </div>
          </div>
        </div>
      </div>


      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteCardMutation.mutate()}
        title="Excluir cartão?"
        description="Essa ação é permanente e não pode ser desfeita."
        confirmText="Excluir"
        isLoading={deleteCardMutation.isPending}
      />

      {/* Card Action Modal (Move/Copy) */}
      {actionModalType && (
        <CardActionModal
          isOpen={!!actionModalType}
          onClose={() => setActionModalType(null)}
          cardId={cardId}
          currentBoardId={boardId}
          currentColumnId={card.column.id}
          type={actionModalType}
        />
      )}

      {/* Create From Template Modal */}
      {showCreateFromTemplate && (
        <CreateFromTemplateModal
          isOpen={showCreateFromTemplate}
          onClose={() => setShowCreateFromTemplate(false)}
          cardId={cardId}
          boardId={boardId}
          currentColumnId={card.column.id}
          templateTitle={card.title}
        />
      )}

      {/* Move the popover back here if needed for z-index or just keep it anchored */}
      <CardCoverPopover
        isOpen={!!coverAnchor}
        anchorRect={coverAnchor}
        onClose={() => setCoverAnchor(null)}
        cardId={cardId}
        currentCover={{
          type: card.coverType,
          color: card.coverColor,
          imageUrl: card.coverImageUrl,
          imageKey: card.coverImageKey,
          size: card.coverSize,
        }}
        onUpdate={(data) => updateCardMutation.mutate(data)}
        onUpload={(file) => uploadCoverMutation.mutate(file)}
        onRemove={() => removeCoverMutation.mutate()}
        isUpdating={uploadCoverMutation.isPending || updateCardMutation.isPending}
      />
    </div>
  )
}

function DatePickerPopover({
  value,
  onChange,
  onClose,
}: {
  value: string | null
  onChange: (date: string | null) => void
  onClose: () => void
}) {
  const [date, setDate] = React.useState(value ? toLocalDateTimeString(value) : '')

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 top-full mt-1 w-64 bg-popover rounded-lg shadow-xl border border-border/60 p-3 z-20 animate-in fade-in zoom-in-95 duration-200">
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={() => onChange(date ? new Date(date).toISOString() : null)}
            disabled={!date}
            className="flex-1"
          >
            Salvar
          </Button>
          {value && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange(null)}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

function AddActionsPopover({
  onClose,
  onAction,
}: {
  onClose: () => void
  onAction: (action: 'labels' | 'checklist' | 'dates') => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 top-full mt-1 w-64 bg-popover rounded-lg shadow-xl border border-border/60 p-3 z-20 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Adicionar</h4>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        
        <div className="space-y-1">
          <button
            onClick={() => onAction('labels')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 rounded-md transition-colors text-left text-foreground"
          >
            <Tag className="h-4 w-4 text-muted-foreground" />
            Etiquetas
          </button>
          
          <button
            onClick={() => onAction('checklist')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 rounded-md transition-colors text-left text-foreground"
          >
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            Checklist
          </button>
          
          <button
            onClick={() => onAction('dates')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 rounded-md transition-colors text-left text-foreground"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            Datas
          </button>
        </div>
      </div>
    </>
  )
}

function CardActionsMenuPopover({
  anchorRect,
  onClose,
  onAction,
  isTemplate,
}: {
  anchorRect: DOMRect
  onClose: () => void
  onAction: (type: 'move' | 'copy' | 'toggle-template') => void
  isTemplate: boolean
}) {
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  React.useLayoutEffect(() => {
    if (popoverRef.current) {
      const popoverWidth = 240
      const viewportWidth = window.innerWidth
      const offset = 8

      let top = anchorRect.bottom + offset
      let left = anchorRect.left - (popoverWidth - anchorRect.width)

      if (left < offset) left = offset
      if (left + popoverWidth > viewportWidth) left = viewportWidth - popoverWidth - offset

      setPosition({ top, left })
    }
  }, [anchorRect])

  return createPortal(
    <>
      <div className="fixed inset-0 z-[120]" onClick={onClose} />
      <div
        ref={popoverRef}
        style={{ top: position.top, left: position.left }}
        className="fixed w-[240px] bg-popover border border-border rounded-lg shadow-xl z-[130] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
          <span className="text-sm font-semibold text-muted-foreground">Ações</span>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        
        <div className="p-1">
          <button
            onClick={() => onAction('move')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 rounded-md transition-colors text-left text-foreground"
          >
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            Mover
          </button>
          
          <button
            onClick={() => onAction('copy')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 rounded-md transition-colors text-left text-foreground"
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
            Copiar
          </button>
          
          <div className="h-px bg-border/40 my-1" />

          <button
            onClick={() => onAction('toggle-template')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 rounded-md transition-colors text-left text-foreground"
          >
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">Transformar em template</span>
            {isTemplate && <Check className="h-4 w-4 ml-auto text-primary" />}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

