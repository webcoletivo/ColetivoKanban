'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlignLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { RichTextEditor, RichTextDisplay } from '@/components/ui/rich-text-editor'
import { cn } from '@/lib/utils'

interface CardDescriptionProps {
  cardId: string
  boardId: string
  description: string | null
}

export function CardDescription({ cardId, boardId, description }: CardDescriptionProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isEditing, setIsEditing] = React.useState(false)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isLongDescription, setIsLongDescription] = React.useState(false)
  const [value, setValue] = React.useState(description || '')
  
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setValue(description || '')
  }, [description])

  // Collapsed height threshold for "Ver mais" detection (~8-10 lines of text)
  const COLLAPSED_HEIGHT = 220

  React.useEffect(() => {
    if (contentRef.current && !isEditing) {
      const height = contentRef.current.scrollHeight
      setIsLongDescription(height > COLLAPSED_HEIGHT)
    }
  }, [description, isEditing])

  const updateMutation = useMutation({
    mutationFn: async (newDescription: string) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription || null }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar descrição')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      setIsEditing(false)
    },
    onError: () => {
      addToast('error', 'Erro ao salvar descrição')
    },
  })

  const handleSave = React.useCallback(() => {
    // Basic empty check (strip tags/whitespace)
    const stripped = value.replace(/<[^>]*>/g, '').trim()
    if (!stripped && !value.includes('<img')) {
      // Allow empty to clear description
      updateMutation.mutate('')
    } else {
      updateMutation.mutate(value)
    }
  }, [value, updateMutation])

  const handleCancel = React.useCallback(() => {
    setValue(description || '')
    setIsEditing(false)
  }, [description])

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlignLeft className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Descrição</h3>
      </div>

      {isEditing ? (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <RichTextEditor
            content={value}
            onChange={setValue}
            placeholder=""
            autoFocus
            onCmdEnter={handleSave}
            onEscape={handleCancel}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} isLoading={updateMutation.isPending}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div
            onClick={() => {
              if (!description) {
                setIsEditing(true)
                return
              }
              
              if (isLongDescription && !isExpanded) {
                setIsExpanded(true)
              } else {
                setIsEditing(true)
              }
            }}
            className={cn(
              "text-sm rounded-lg transition-colors p-3 cursor-pointer",
              !description && "min-h-[60px] bg-secondary/30 hover:bg-secondary/50",
              description && "bg-transparent hover:bg-secondary/30",
              isLongDescription && !isExpanded && "max-h-[220px] overflow-hidden"
            )}
          >
            {description ? (
              <div ref={contentRef}>
                <RichTextDisplay content={description} />
              </div>
            ) : (
              <p className="text-muted-foreground">Adicione uma descrição mais detalhada...</p>
            )}

            {isLongDescription && !isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-2">
                 {/* The button is handled separately below for better click target */}
              </div>
            )}
          </div>
          
          {isLongDescription && (
            <div className="mt-2 text-center">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
                className="h-8 font-medium bg-secondary/80 hover:bg-secondary text-secondary-foreground"
              >
                {isExpanded ? 'Ver menos' : 'Ver mais'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
