'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, MessageSquare, Paperclip, CheckSquare, Circle, CheckCircle2, Check, LayoutTemplate } from 'lucide-react'
import { cn, formatDate, isOverdue, isDueToday, getAssetUrl } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface CardPreviewProps {
  boardId: string
  columnId: string
  card: {
    id: string
    title: string
    description: string | null
    dueAt: string | null
    isCompleted: boolean
    labels: Array<{ id: string; name: string; color: string }>
    checklistProgress: { total: number; completed: number }
    commentCount: number
    attachmentCount: number
    coverType?: string | null
    coverColor?: string | null
    coverImageUrl?: string | null
    coverImageKey?: string | null
    coverSize?: string | null
    isTemplate?: boolean
    updatedAt: string 
  }
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent, cardId: string, cardRect: DOMRect) => void
  onQuickUpdate?: (cardId: string, data: { title: string }) => void
  isDragging?: boolean
  isActive?: boolean
  isEditing?: boolean
  onSetEditing?: (editing: boolean) => void
  labelsExpanded?: boolean
  onToggleLabelsExpanded?: () => void
}

export function CardPreview({ 
  card, 
  boardId,
  columnId, 
  onClick, 
  onContextMenu,
  onQuickUpdate,
  isDragging: isDraggingProp,
  isActive,
  isEditing,
  onSetEditing,
  labelsExpanded,
  onToggleLabelsExpanded
}: CardPreviewProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [tempTitle, setTempTitle] = React.useState(card.title)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const toggleCompleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !card.isCompleted }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar status')
      return res.json()
    },
    onMutate: async () => {
      // Optimistic update would require more complex cache updates, 
      // for now relying on fast server response + invalidation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      queryClient.invalidateQueries({ queryKey: ['card', card.id] })
    },
    onError: () => {
      addToast('error', 'Erro ao atualizar status')
    },
  })

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleCompleteMutation.mutate()
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    disabled: isEditing, // Disable drag while editing
    data: { type: 'card', card, columnId },
  })

  // Focus textarea when quick editing starts
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTempTitle(card.title)
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing, card.title])

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault()
      e.stopPropagation()
      const cardRect = e.currentTarget.getBoundingClientRect()
      onContextMenu(e, card.id, cardRect)
    }
  }

  const handleQuickSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!tempTitle.trim() || tempTitle === card.title) {
       onSetEditing?.(false)
       return
    }
    
    if (onQuickUpdate) {
      onQuickUpdate(card.id, { title: tempTitle })
    }
    onSetEditing?.(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuickSave()
    }
    if (e.key === 'Escape') {
      setTempTitle(card.title)
      onSetEditing?.(false)
    }
  }

  // ... inside CardPreview
  const [imageError, setImageError] = React.useState(false)

  // Reset error when url changes
  React.useEffect(() => {
    setImageError(false)
  }, [card.coverImageUrl])

  // ... existing hooks

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isDragging = isDraggingProp || isSortableDragging
  const hasChecklist = card.checklistProgress.total > 0
  const checklistComplete = card.checklistProgress.completed === card.checklistProgress.total
  const hasDueDate = !!card.dueAt
  const overdue = hasDueDate && !card.isCompleted && isOverdue(card.dueAt!)
  const dueToday = hasDueDate && !card.isCompleted && isDueToday(card.dueAt!)

  const showCover = card.coverType !== 'none' && (card.coverColor || card.coverImageUrl || card.coverImageKey)
  const isFullCover = showCover && card.coverSize === 'full'
  const isBlockCover = showCover && (!card.coverSize || card.coverSize === 'block')
  const isImageCover = card.coverType === 'image' && !!(card.coverImageKey || card.coverImageUrl) && !imageError
  
  // Decide background color for full cover (fallback or color mode)
  const fullCoverBgColor = card.coverType === 'color' ? card.coverColor || '#dfe1e6' : '#dfe1e6'

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isEditing) {
          e.stopPropagation()
          onClick?.()
        }
      }}
      onContextMenu={handleContextMenu}
      data-no-drag-scroll
      data-card-id={card.id}
      className={cn(
        'flex-shrink-0 bg-card text-card-foreground rounded-lg shadow-sm border border-border/60 box-border',
        !isEditing && 'overflow-hidden',
        'cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group relative',
        isDragging && 'opacity-50 shadow-lg rotate-2',
        isActive && 'z-50 ring-2 ring-primary border-primary shadow-[0_0_20px_rgba(0,0,0,0.3)] dark:shadow-[0_0_30px_rgba(0,0,0,0.5)]',
        isEditing && 'z-50 ring-2 ring-primary border-primary shadow-[0_0_25px_rgba(0,0,0,0.4)]',
        card.isCompleted && 'opacity-60',
        isFullCover && 'h-[95px] text-white border-0' // Fixed height for full cover
      )}
      style={style}
    >
      {/* Full Cover Background */}
      {isFullCover && (
        <div 
          className="absolute inset-0 z-0 transition-colors duration-200"
          style={{ backgroundColor: isImageCover ? 'transparent' : fullCoverBgColor }}
        >
          {isImageCover && (
            <>
              {/* Using standard img for simplicity and onError support without Next/Image domain config */}
              <img 
                src={getAssetUrl(card.coverImageKey || card.coverImageUrl, card.updatedAt)!} 
                alt="Cover"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-black/40" /> {/* Gradient overlay */}
            </>
          )}
        </div>
      )}

      {/* Strip Cover (32px for color, 101px for image) */}
      {showCover && card.coverSize === 'strip' && (
        <div 
          className={cn(
            "w-full relative overflow-hidden",
            isImageCover ? "h-[101px]" : "h-[32px]"
          )}
          style={{ 
            backgroundColor: card.coverType === 'color' ? card.coverColor || '#dfe1e6' : '#dfe1e6'
          }}
        >
          {isImageCover && (
            <img 
              src={getAssetUrl(card.coverImageKey || card.coverImageUrl, card.updatedAt)!}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          )}
        </div>
      )}

      {/* Block Cover (101px fixed height - title below) */}
      {showCover && isBlockCover && (
        <div 
          className="w-full relative overflow-hidden rounded-t-lg shrink-0" 
          style={{ 
            height: '101px',
            minHeight: '101px',
            maxHeight: '101px',
            backgroundColor: card.coverType === 'color' ? card.coverColor || '#dfe1e6' : '#dfe1e6'
          }}
        >
          {isImageCover && (
            <img 
              src={getAssetUrl(card.coverImageKey || card.coverImageUrl, card.updatedAt)!}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          )}
        </div>
      )}

      {/* Card Content Area */}
      <div className={cn(
        'p-3 relative',
        isFullCover && 'absolute inset-0 flex flex-col justify-end z-10'
      )}>
        {/* Quick Edit Overlay */}
        {isEditing && (
          <div 
            className="absolute top-0 left-0 w-full min-h-full z-[100] bg-card text-card-foreground rounded-lg p-3 flex flex-col gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              ref={textareaRef}
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-sm font-medium leading-snug focus:outline-none resize-none min-h-[60px]"
              rows={4}
            />
            <div className="flex justify-start pb-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuickSave()
                }}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
              >
                Salvar
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          {/* Checkbox Column - Hidden in full cover */}
          {!isEditing && !isFullCover && (
            <div 
              className={cn(
                "shrink-0 flex flex-col pt-0.5 transition-all duration-200 ease-in-out overflow-hidden",
                // Width transition: 0 when hidden, 5 (1.25rem) when visible
                (card.isCompleted || isActive) ? "w-5 opacity-100 mr-0" : "w-0 opacity-0 -mr-2 group-hover:w-5 group-hover:opacity-100 group-hover:mr-0"
              )}
            >
              <div 
                role="button"
                onClick={handleToggleComplete}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 border shadow-sm",
                  card.isCompleted 
                    ? "bg-green-100 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/60" 
                    : "bg-background text-transparent hover:text-muted-foreground border-muted-foreground/30 hover:border-muted-foreground/50 hover:scale-105"
                )}
                title={card.isCompleted ? "Marcar como não concluído" : "Marcar como concluído"}
              >
                {card.isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                {!card.isCompleted && <Check className="h-3 w-3 opacity-0 hover:opacity-100" />}
              </div>
            </div>
          )}

          {/* Main Content Column */}
          <div className="flex-1 min-w-0">
            {/* Labels - Hidden in full cover */}
            {card.labels.length > 0 && !isFullCover && (
              <div className="flex flex-wrap gap-1 mb-2">
                {card.labels.map((label) => {
                  // Determine if text contrast should be light or dark
                  const colorLower = label.color.toLowerCase()
                  const isLightBg = ['#eab308', '#22c55e', '#14b8a6'].includes(colorLower)
                  // Dark colors that need special treatment for visibility
                  const isDarkColor = ['#344563', '#000000', '#1a1a1a', '#0f0f0f', '#111111'].includes(colorLower) || colorLower.startsWith('#1') || colorLower.startsWith('#2') || colorLower.startsWith('#3')
                  
                  return (
                    <button
                      key={label.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        onToggleLabelsExpanded?.()
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        "rounded-full transition-all duration-200 cursor-pointer hover:opacity-80",
                        labelsExpanded 
                          ? "px-2 py-0.5 text-xs font-medium" 
                          : "h-2 w-10",
                        // Add subtle highlight for dark labels
                        isDarkColor && "ring-1 ring-inset ring-white/20 dark:ring-white/30"
                      )}
                      style={{ 
                        backgroundColor: label.color,
                        color: labelsExpanded ? (isLightBg ? '#1a1a1a' : '#ffffff') : undefined,
                        // Add inner glow for dark colors
                        boxShadow: isDarkColor ? 'inset 0 0 0 1px rgba(255,255,255,0.15)' : undefined
                      }}
                      title={label.name}
                    >
                      {labelsExpanded ? label.name : null}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Title */}
            <p className={cn(
              'text-sm font-medium leading-snug mb-1 line-clamp-2 break-words',
              card.isCompleted && 'line-through text-muted-foreground',
              card.coverType !== 'none' && card.coverSize === 'full' && 'text-shadow-sm font-semibold'
            )}>
              {card.title}
            </p>

            {/* Badges - Hidden in full cover */}
            {(hasDueDate || hasChecklist || card.commentCount > 0 || card.attachmentCount > 0 || card.isTemplate) && !isFullCover && (
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                {/* Template Badge */}
                {card.isTemplate && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    <LayoutTemplate className="h-3 w-3" />
                    Template
                  </span>
                )}

                {/* Due Date */}
                {hasDueDate && (
                  <span className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary/80 transition-colors',
                    card.isCompleted 
                       ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                       : (overdue ? 'bg-destructive/10 text-destructive' : (dueToday ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-muted-foreground'))
                  )}>
                    {card.isCompleted ? <CheckSquare className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {formatDate(card.dueAt!)}
                  </span>
                )}

                {/* Checklist Progress */}
                {hasChecklist && (
                  <span className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded',
                    checklistComplete 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                  )}>
                    <CheckSquare className="h-3 w-3" />
                    {card.checklistProgress.completed}/{card.checklistProgress.total}
                  </span>
                )}

                {/* Comments */}
                {card.commentCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {card.commentCount}
                  </span>
                )}

                {/* Attachments */}
                {card.attachmentCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {card.attachmentCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
